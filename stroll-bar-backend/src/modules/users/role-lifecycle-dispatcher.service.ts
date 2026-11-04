import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { EmailService } from '../email/email.service';
import { buildRoleLifecycleMessage } from '../email/role-lifecycle-message';
import { effectiveRole } from './effective-role.service';
import { PaidGrantEntity, PaidGrantStatus } from './entities/paid-grant.entity';
import { RoleLifecycleEventType, RoleLifecycleOutboxEntity, RoleLifecycleOutboxStatus } from './entities/role-lifecycle-outbox.entity';
import { UserEntity } from './entities/user.entity';

export const LIFECYCLE_LEASE_MS = 5 * 60_000;
export function lifecycleRetryDelay(attempt: number): number {
	return Math.min(10 * 60_000, 30_000 * 2 ** Math.min(Math.max(attempt - 1, 0), 5));
}

@Injectable()
export class RoleLifecycleDispatcher {
	private readonly logger = new Logger(RoleLifecycleDispatcher.name);

	constructor(
		private readonly dataSource: DataSource,
		private readonly email: EmailService
	) {}

	async dispatchOne(eventId?: string): Promise<'idle' | 'sent' | 'skipped' | 'retry'> {
		const token = randomUUID();
		const event = await this.claim(token, eventId);
		if (!event) return 'idle';
		this.logger.log({ event: 'role_mail_claimed', eventId: event.id, attempt: event.attemptCount });
		try {
			const message = await this.prepare(event, token);
			if (!message) return 'skipped';
			// Stable across every attempt. Automatic retry is deliberately at-least-once, not exactly-once.
			// Brevo requires a UUID, not a prefixed application string.
			await this.email.sendRoleLifecycleMessage(message, event.id);
			const result = await this.dataSource
				.getRepository(RoleLifecycleOutboxEntity)
				.update(
					{ id: event.id, leaseToken: token },
					{ status: RoleLifecycleOutboxStatus.SENT, sentAt: new Date(), lastError: null, leaseToken: null, leaseUntil: null }
				);
			if (result.affected !== 1) throw new Error('Delivery receipt lease lost.');
			this.logger.log({ event: 'role_mail_sent', eventId: event.id, attempt: event.attemptCount });
			return 'sent';
		} catch {
			// Never persist provider response bodies, recipient addresses, or credentials in logs/errors.
			await this.dataSource.getRepository(RoleLifecycleOutboxEntity).update(
				{ id: event.id, leaseToken: token },
				{
					status: RoleLifecycleOutboxStatus.PENDING,
					leaseToken: null,
					leaseUntil: null,
					availableAt: new Date(Date.now() + lifecycleRetryDelay(event.attemptCount)),
					lastError: 'Delivery or receipt failed; automatic retry may duplicate mail after provider dedupe expires.'
				}
			);
			this.logger.error({ event: 'role_mail_retry_scheduled', eventId: event.id, attempt: event.attemptCount });
			return 'retry';
		}
	}

	async drain(budgetMs = 8 * 60_000): Promise<{ sent: number; skipped: number; retry: number; exhausted: boolean }> {
		const deadline = Date.now() + budgetMs;
		const counts = { sent: 0, skipped: 0, retry: 0, exhausted: false };
		while (Date.now() < deadline) {
			const results = await Promise.all(Array.from({ length: 10 }, () => this.dispatchOne()));
			for (const result of results) if (result !== 'idle') counts[result] += 1;
			if (results.every((result) => result === 'idle')) {
				this.logger.log({ event: 'role_mail_job_complete', ...counts });
				return counts;
			}
		}
		counts.exhausted = true;
		this.logger.error({ event: 'role_mail_job_budget_exhausted', ...counts });
		return counts;
	}

	private async claim(token: string, eventId?: string): Promise<RoleLifecycleOutboxEntity | undefined> {
		return this.dataSource.transaction(async (manager) => {
			const event = await manager
				.createQueryBuilder(RoleLifecycleOutboxEntity, 'event')
				.where(
					`((event.status = :pending AND event.availableAt <= CURRENT_TIMESTAMP)
					OR (event.status = :processing AND event.leaseUntil <= CURRENT_TIMESTAMP))`,
					{
						pending: RoleLifecycleOutboxStatus.PENDING,
						processing: RoleLifecycleOutboxStatus.PROCESSING
					}
				)
				.andWhere(eventId ? 'event.id = :eventId' : 'TRUE', { eventId })
				.orderBy('event.availableAt', 'ASC')
				.addOrderBy('event.id', 'ASC')
				.take(1)
				.setLock('pessimistic_write')
				.setOnLocked('skip_locked')
				.getOne();
			if (!event) return undefined;
			event.status = RoleLifecycleOutboxStatus.PROCESSING;
			event.leaseToken = token;
			event.leaseUntil = new Date(Date.now() + LIFECYCLE_LEASE_MS);
			event.lastAttemptAt = new Date();
			event.attemptCount += 1;
			return manager.save(RoleLifecycleOutboxEntity, event);
		});
	}

	private async prepare(event: RoleLifecycleOutboxEntity, token: string) {
		return this.dataSource.transaction(async (manager) => {
			const current = await manager.findOneOrFail(RoleLifecycleOutboxEntity, {
				where: { id: event.id, leaseToken: token },
				lock: { mode: 'pessimistic_write' }
			});
			const grant = await manager.findOneOrFail(PaidGrantEntity, { where: { id: event.grantId } });
			const user = await manager.findOneOrFail(UserEntity, { where: { id: event.userId } });
			const expiry = event.eventType === RoleLifecycleEventType.PAID_GRANT_EXPIRY;
			const deliverable =
				user.isActive && (expiry ? [PaidGrantStatus.ACTIVE, PaidGrantStatus.CANCELLED].includes(grant.status) : !!grant.cancelledAt);
			if (!deliverable) {
				current.status = RoleLifecycleOutboxStatus.SKIPPED;
				current.lastError = 'Inactive user or grant no longer eligible for this notification.';
				current.leaseToken = null;
				current.leaseUntil = null;
				await manager.save(current);
				this.logger.log({ event: 'role_mail_skipped', eventId: event.id });
				return null;
			}
			if (!current.message) {
				const grants = await manager.find(PaidGrantEntity, { where: { userId: user.id } });
				current.message = buildRoleLifecycleMessage({
					recipient: user.email,
					username: user.username,
					language: user.preferredLanguage,
					plan: grant.plan,
					eventType: event.eventType,
					eventAt: expiry ? grant.expiresAt : grant.cancelledAt!,
					expiresAt: grant.expiresAt,
					effectivePlanAfterExpiry: effectiveRole(user.role, grants, grant.expiresAt)
				});
				await manager.save(current);
			}
			return current.message;
		});
	}
}
