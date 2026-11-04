import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum RoleLifecycleEventType {
	PAID_GRANT_EXPIRY = 'paid_grant_expiry',
	PAID_GRANT_CANCELLED = 'paid_grant_cancelled'
}

export enum RoleLifecycleOutboxStatus {
	PENDING = 'pending',
	PROCESSING = 'processing',
	SENT = 'sent',
	QUARANTINED = 'quarantined',
	SKIPPED = 'skipped'
}

@Entity('role_lifecycle_outbox')
@Index(['eventType', 'grantId'], { unique: true })
@Index(['status', 'availableAt'])
export class RoleLifecycleOutboxEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: 'varchar', length: 40 })
	eventType!: RoleLifecycleEventType;

	@Column('uuid')
	userId!: string;

	@Column('uuid')
	grantId!: string;

	@Column('timestamptz')
	availableAt!: Date;

	@Column({ type: 'varchar', length: 20, default: RoleLifecycleOutboxStatus.PENDING })
	status!: RoleLifecycleOutboxStatus;

	@Column({ type: 'int', default: 0 })
	attemptCount!: number;

	@Column({ type: 'text', nullable: true })
	lastError?: string | null;

	@Column('timestamptz', { nullable: true })
	lastAttemptAt?: Date | null;

	@Column('uuid', { nullable: true })
	leaseToken?: string | null;

	@Column('timestamptz', { nullable: true })
	leaseUntil?: Date | null;

	@Column('jsonb', { nullable: true })
	message?: { recipient: string; subject: string; textContent: string; htmlContent: string } | null;

	@Column('timestamptz', { nullable: true })
	sentAt?: Date | null;

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt!: Date;

	@UpdateDateColumn({ type: 'timestamptz' })
	updatedAt!: Date;
}
