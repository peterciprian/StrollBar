import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { AuditAction, AuditEventEntity } from '../../common/audit.entity';
import { LegacyRoleCutoverEntity } from './entities/legacy-role-cutover.entity';
import { UserEntity, UserRole } from './entities/user.entity';
import { lockAdmin } from './role-assignments.service';
import { PaidPlan } from './entities/paid-grant.entity';

const LEGACY_ROLES = [UserRole.CREATOR, UserRole.PREMIUM];

export function earliestCutover(noticeAt: Date): Date {
	const earliest = new Date(noticeAt);
	earliest.setUTCDate(earliest.getUTCDate() + 7);
	return earliest;
}

export class LegacyRoleCutover {
	constructor(private readonly dataSource: DataSource) {}

	async preview() {
		const users = await this.dataSource.getRepository(UserEntity).find({
			where: { role: In(LEGACY_ROLES) }, select: { id: true, role: true }, order: { id: 'ASC' }
		});
		const notices = await this.dataSource.getRepository(LegacyRoleCutoverEntity).find({ order: { userId: 'ASC' } });
		return { dryRun: true, targets: users, notices, contentChanges: 0, adminChanges: 0 };
	}

	async recordNotice(userIds: string[], cutoverAt: Date, noticeReference: string, actorUserId: string) {
		if (!userIds.length || new Set(userIds).size !== userIds.length || !noticeReference?.trim() || !Number.isFinite(cutoverAt.getTime())) {
			throw new BadRequestException('Explicit unique user IDs, a finite cutover timestamp and delivered-notice reference are required.');
		}
		return this.dataSource.transaction(async (manager) => {
			await lockAdmin(manager, actorUserId);
			// Database time is authoritative. Operators cannot backdate notice or shorten an existing notice period.
			const [{ now }] = await manager.query('SELECT clock_timestamp() AS now');
			const noticeAt = new Date(now);
			if (cutoverAt < earliestCutover(noticeAt)) throw new BadRequestException('Cutover must be at least seven UTC calendar days after notice recording.');
			for (const userId of [...userIds].sort()) {
				const user = await manager.findOne(UserEntity, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
				if (!user || !LEGACY_ROLES.includes(user.role)) throw new ConflictException(`User ${userId} is not a legacy paid-role user.`);
				if (await manager.existsBy(LegacyRoleCutoverEntity, { userId })) throw new ConflictException(`User ${userId} already has a notice; no changes made.`);
				await manager.save(LegacyRoleCutoverEntity, {
					userId, previousRole: user.role === UserRole.CREATOR ? PaidPlan.CREATOR : PaidPlan.PREMIUM,
					noticeAt, cutoverAt, completedAt: null, actorUserId,
					noticeReference: noticeReference.trim()
				});
				await this.audit(manager, userId, actorUserId, {
					operation: 'legacy_notice_recorded', previousRole: user.role, noticeAt: noticeAt.toISOString(),
					cutoverAt: cutoverAt.toISOString(), noticeReference: noticeReference.trim()
				});
			}
			return { noticed: userIds.length, noticeAt, cutoverAt };
		});
	}

	async cutover(userIds: string[], actorUserId: string) {
		if (!userIds.length || new Set(userIds).size !== userIds.length) throw new BadRequestException('Explicit unique user IDs are required.');
		return this.dataSource.transaction(async (manager) => {
			await lockAdmin(manager, actorUserId);
			const [{ now }] = await manager.query('SELECT clock_timestamp() AS now');
			const completedAt = new Date(now);
			let changed = 0;
			for (const userId of [...userIds].sort()) {
				const user = await manager.findOne(UserEntity, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
				const notice = await manager.findOne(LegacyRoleCutoverEntity, { where: { userId }, lock: { mode: 'pessimistic_write' } });
				if (!user || !notice) throw new ConflictException(`User ${userId} has no recorded notice.`);
				if (notice.completedAt) {
					if (user.role !== UserRole.SIMPLE) throw new ConflictException(`User ${userId} changed role after cutover; review manually.`);
					continue;
				}
				if (user.role !== (notice.previousRole as string) || !LEGACY_ROLES.includes(user.role)) {
					throw new ConflictException(`User ${userId} no longer matches the noticed legacy role; review manually.`);
				}
				if (completedAt < notice.cutoverAt || completedAt < earliestCutover(notice.noticeAt)) {
					throw new ConflictException(`User ${userId} is not yet due for cutover.`);
				}
				await manager.update(UserEntity, { id: userId }, { role: UserRole.SIMPLE });
				await manager.update(LegacyRoleCutoverEntity, { userId }, { completedAt });
				await this.audit(manager, userId, actorUserId, {
					operation: 'legacy_role_cutover', previousRole: notice.previousRole, role: UserRole.SIMPLE,
					noticeAt: notice.noticeAt.toISOString(), cutoverAt: notice.cutoverAt.toISOString(), completedAt: completedAt.toISOString()
				});
				changed += 1;
			}
			return { changed, alreadyCompleted: userIds.length - changed, contentChanges: 0, adminChanges: 0 };
		});
	}

	private audit(manager: EntityManager, userId: string, actorUserId: string, metadata: Record<string, unknown>) {
		return manager.save(AuditEventEntity, {
			action: AuditAction.ROLE_CHANGE, userId, actorUserId, success: true, ipAddress: null, metadata
		});
	}
}
