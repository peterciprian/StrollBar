import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PaidPlan {
	CREATOR = 'creator',
	PREMIUM = 'premium'
}

export enum PaidGrantStatus {
	ACTIVE = 'active',
	CANCELLED = 'cancelled',
	SUSPENDED = 'suspended',
	REVOKED = 'revoked'
}

@Entity('paid_grants')
@Index(['userId', 'startsAt', 'expiresAt'])
@Check(`"plan" IN ('creator', 'premium')`)
@Check(`"status" IN ('active', 'cancelled', 'suspended', 'revoked')`)
@Check(`"expiresAt" > "startsAt"`)
export class PaidGrantEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column('uuid')
	userId!: string;

	@Column({ type: 'varchar', length: 20 })
	plan!: PaidPlan;

	@Column({ type: 'varchar', length: 20, default: PaidGrantStatus.ACTIVE })
	status!: PaidGrantStatus;

	@Column('timestamptz')
	startsAt!: Date;

	@Column('timestamptz')
	expiresAt!: Date;

	@Column({ type: 'varchar', length: 32, default: 'manual' })
	source!: string;

	@Column('uuid')
	actorUserId!: string;

	@Column('text')
	reason!: string;

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt!: Date;
}
