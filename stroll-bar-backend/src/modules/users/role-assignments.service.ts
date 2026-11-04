import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuditAction, AuditEventEntity } from '../../common/audit.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreatePaidGrantDto } from './dto/create-paid-grant.dto';
import { PaidGrantEntity, PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import { UserEntity, UserRole } from './entities/user.entity';
import { RoleLifecycleEventType, RoleLifecycleOutboxEntity } from './entities/role-lifecycle-outbox.entity';
import { RoleLifecycleDispatcher } from './role-lifecycle-dispatcher.service';

export async function lockAdmin(manager: EntityManager, actorUserId: string): Promise<void> {
	const actor = await manager.findOne(UserEntity, {
		where: { id: actorUserId, isActive: true },
		lock: { mode: 'pessimistic_write' }
	});
	if (!actor || actor.role !== UserRole.ADMIN) {
		throw new ForbiddenException('An active administrator is required.');
	}
}

@Injectable()
export class RoleAssignmentsService {
	private readonly logger = new Logger(RoleAssignmentsService.name);

	constructor(
		private readonly dataSource: DataSource,
		private readonly dispatcher: RoleLifecycleDispatcher
	) {}

	async assignAdmin(userId: string, role: UserRole, actor: AuthenticatedUser, ipAddress?: string) {
		if (role !== UserRole.SIMPLE && role !== UserRole.ADMIN) {
			throw new BadRequestException('Paid plans require an expiring grant; permanent paid role assignment is disabled.');
		}
		return this.dataSource.transaction(async (manager) => {
			await lockAdmin(manager, actor.userId);
			const user = await manager.findOne(UserEntity, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
			if (!user) throw new NotFoundException('User not found.');
			if (user.role === UserRole.CREATOR || user.role === UserRole.PREMIUM) {
				throw new ConflictException('Legacy paid roles must use the noticed operator cutover first.');
			}
			if (actor.userId === userId && role !== UserRole.ADMIN) {
				throw new ConflictException('Administrators cannot remove their own administrator assignment.');
			}
			const previousRole = user.role;
			user.role = role;
			await manager.save(UserEntity, user);
			await manager.save(AuditEventEntity, {
				action: AuditAction.ROLE_CHANGE,
				userId,
				actorUserId: actor.userId,
				success: true,
				ipAddress: ipAddress ?? null,
				metadata: { operation: 'admin_assignment', previousRole, role }
			});
			return user;
		});
	}

	async createGrant(userId: string, dto: CreatePaidGrantDto, actor: AuthenticatedUser, ipAddress?: string) {
		const startsAt = new Date(dto.startsAt);
		const expiresAt = new Date(dto.expiresAt);
		if (
			!Object.values(PaidPlan).includes(dto.plan) ||
			!Number.isFinite(startsAt.getTime()) ||
			!Number.isFinite(expiresAt.getTime()) ||
			expiresAt <= startsAt ||
			!dto.reason?.trim()
		) {
			throw new BadRequestException('A paid plan, finite increasing UTC grant period and reason are required.');
		}

		return this.dataSource.transaction(async (manager) => {
			await lockAdmin(manager, actor.userId);
			const user = await manager.findOne(UserEntity, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
			if (!user) throw new NotFoundException('User not found.');
			const grant = await manager.save(
				PaidGrantEntity,
				manager.create(PaidGrantEntity, {
					userId,
					plan: dto.plan,
					startsAt,
					expiresAt,
					status: PaidGrantStatus.ACTIVE,
					source: 'manual',
					actorUserId: actor.userId,
					reason: dto.reason.trim()
				})
			);
			await manager.save(
				RoleLifecycleOutboxEntity,
				manager.create(RoleLifecycleOutboxEntity, {
					eventType: RoleLifecycleEventType.PAID_GRANT_EXPIRY,
					userId,
					grantId: grant.id,
					availableAt: expiresAt
				})
			);
			await manager.save(AuditEventEntity, {
				action: AuditAction.ROLE_CHANGE,
				userId,
				actorUserId: actor.userId,
				success: true,
				ipAddress: ipAddress ?? null,
				metadata: {
					operation: 'paid_grant_created',
					grantId: grant.id,
					plan: grant.plan,
					startsAt: startsAt.toISOString(),
					expiresAt: expiresAt.toISOString(),
					reason: grant.reason
				}
			});
			return grant;
		});
	}

	async listGrants(userId: string, actor: AuthenticatedUser) {
		return this.dataSource.transaction(async (manager) => {
			await lockAdmin(manager, actor.userId);
			const user = await manager.findOne(UserEntity, { where: { id: userId } });
			if (!user) throw new NotFoundException('User not found.');
			return manager.find(PaidGrantEntity, { where: { userId }, order: { createdAt: 'DESC' } });
		});
	}

	async revokeGrant(userId: string, grantId: string, reason: string, actor: AuthenticatedUser, ipAddress?: string) {
		if (!reason?.trim()) throw new BadRequestException('Revocation requires a reason.');
		return this.dataSource.transaction(async (manager) => {
			await lockAdmin(manager, actor.userId);
			const grant = await manager.findOne(PaidGrantEntity, { where: { id: grantId, userId }, lock: { mode: 'pessimistic_write' } });
			if (!grant) throw new NotFoundException('Paid grant not found.');
			if (grant.status === PaidGrantStatus.REVOKED) return grant;
			const previousStatus = grant.status;
			grant.status = PaidGrantStatus.REVOKED;
			await manager.save(PaidGrantEntity, grant);
			await manager.save(AuditEventEntity, {
				action: AuditAction.ROLE_CHANGE,
				userId,
				actorUserId: actor.userId,
				success: true,
				ipAddress: ipAddress ?? null,
				metadata: { operation: 'paid_grant_revoked', grantId, previousStatus, reason: reason.trim() }
			});
			return grant;
		});
	}

	async cancelGrant(userId: string, grantId: string, reason: string, actor: AuthenticatedUser, ipAddress?: string) {
		if (!reason?.trim()) throw new BadRequestException('Cancellation requires a reason.');
		const result = await this.dataSource.transaction(async (manager) => {
			// Self-service cancellation never grants ADMIN authority or changes another user's grants.
			if (actor.userId !== userId) await lockAdmin(manager, actor.userId);
			else {
				const user = await manager.findOne(UserEntity, { where: { id: userId, isActive: true }, lock: { mode: 'pessimistic_write' } });
				if (!user) throw new ForbiddenException('An active account is required.');
			}
			const grant = await manager.findOne(PaidGrantEntity, {
				where: { id: grantId, userId },
				lock: { mode: 'pessimistic_write' }
			});
			if (!grant) throw new NotFoundException('Paid grant not found.');
			if (grant.status === PaidGrantStatus.CANCELLED) {
				const event = await manager.findOneOrFail(RoleLifecycleOutboxEntity, {
					where: { grantId, eventType: RoleLifecycleEventType.PAID_GRANT_CANCELLED }
				});
				return { grant, eventId: event.id };
			}
			const now = new Date();
			if (grant.status !== PaidGrantStatus.ACTIVE || grant.expiresAt <= now) {
				throw new ConflictException('Only an active, unexpired grant can be cancelled. Revoke is a separate admin action.');
			}
			grant.status = PaidGrantStatus.CANCELLED;
			grant.cancelledAt = now;
			await manager.save(PaidGrantEntity, grant);
			const event = await manager.save(
				RoleLifecycleOutboxEntity,
				manager.create(RoleLifecycleOutboxEntity, {
					eventType: RoleLifecycleEventType.PAID_GRANT_CANCELLED,
					userId,
					grantId,
					availableAt: now
				})
			);
			await manager.save(AuditEventEntity, {
				action: AuditAction.ROLE_CHANGE,
				userId,
				actorUserId: actor.userId,
				success: true,
				ipAddress: ipAddress ?? null,
				metadata: {
					operation: 'paid_grant_cancelled',
					grantId,
					cancelledAt: now.toISOString(),
					expiresAt: grant.expiresAt.toISOString(),
					reason: reason.trim()
				}
			});
			return { grant, eventId: event.id };
		});
		// Commit before contacting email; scheduler recovers failures and process death at this boundary.
		try {
			await this.dispatcher.dispatchOne(result.eventId);
		} catch {
			this.logger.error({ event: 'role_cancellation_dispatch_deferred', eventId: result.eventId });
		}
		return result.grant;
	}
}
