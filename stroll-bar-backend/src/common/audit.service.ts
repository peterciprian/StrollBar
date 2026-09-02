import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditEventEntity } from './audit.entity';

@Injectable()
export class AuditService {
	private readonly logger = new Logger(AuditService.name);

	constructor(@InjectRepository(AuditEventEntity) private readonly repository: Repository<AuditEventEntity>) {}

	async record(event: {
		action: AuditAction;
		userId?: string | null;
		actorUserId?: string | null;
		success: boolean;
		ipAddress?: string;
		metadata?: Record<string, unknown>;
	}): Promise<void> {
		try {
			await this.repository.insert({
				action: event.action,
				userId: event.userId ?? null,
				actorUserId: event.actorUserId ?? null,
				success: event.success,
				ipAddress: event.ipAddress?.slice(0, 64) ?? null,
				metadata: (event.metadata ?? {}) as any
			});
		} catch (error) {
			this.logger.error('Failed to persist audit event.', error instanceof Error ? error.stack : String(error));
		}
	}

	async list(filters: { action?: AuditAction; limit: number }): Promise<AuditEventEntity[]> {
		const limit = Math.min(Math.max(filters.limit || 100, 1), 500);
		return this.repository.find({
			where: filters.action ? { action: filters.action } : {},
			order: { createdAt: 'DESC' },
			take: limit
		});
	}

	forbidden(): never {
		throw new ForbiddenException('Administrator access required.');
	}

	async purgeExpired(retentionDays: number): Promise<void> {
		const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
		const queryRunner = this.repository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		try {
			await queryRunner.query(`SELECT set_config('strollbar.audit_retention', 'true', false)`);
			await queryRunner.manager
				.createQueryBuilder()
				.delete()
				.from(AuditEventEntity)
				.where('"createdAt" < :cutoff', { cutoff })
				.setParameters({ cutoff })
				.execute();
		} finally {
			await queryRunner.query(`SELECT set_config('strollbar.audit_retention', 'false', false)`);
			await queryRunner.release();
		}
	}
}
