import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE } from '../database/column-types';

export enum AuditAction {
	LOGIN = 'login',
	LOGOUT = 'logout',
	PASSWORD_CHANGE = 'password_change',
	PASSWORD_RESET = 'password_reset',
	ROLE_CHANGE = 'role_change'
}

@Entity('audit_events')
@Index(['action', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AuditEventEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: 'varchar', length: 32 })
	action!: AuditAction;

	@Column({ type: 'uuid', nullable: true })
	userId!: string | null;

	@Column({ type: 'uuid', nullable: true })
	actorUserId!: string | null;

	@Column({ type: 'boolean' })
	success!: boolean;

	@Column({ type: 'varchar', length: 64, nullable: true })
	ipAddress!: string | null;

	@Column({ type: 'jsonb', default: '{}' })
	metadata!: Record<string, unknown>;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;
}
