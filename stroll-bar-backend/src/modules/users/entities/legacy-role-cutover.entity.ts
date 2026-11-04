import { Check, Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { PaidPlan } from './paid-grant.entity';

@Entity('legacy_role_cutovers')
@Check(`"previousRole" IN ('creator', 'premium')`)
@Check(`"cutoverAt" >= "noticeAt" + interval '168 hours'`)
export class LegacyRoleCutoverEntity {
	@PrimaryColumn('uuid')
	userId!: string;

	@Column({ type: 'varchar', length: 20 })
	previousRole!: PaidPlan;

	@CreateDateColumn({ type: 'timestamptz' })
	noticeAt!: Date;

	@Column('timestamptz')
	cutoverAt!: Date;

	@Column({ type: 'timestamptz', nullable: true })
	completedAt!: Date | null;

	@Column('uuid')
	actorUserId!: string;

	@Column('text')
	noticeReference!: string;
}
