import { randomUUID } from 'node:crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_JSON_COLUMN_TYPE } from '../../../database/column-types';
import { BadgeRuleCondition } from '../badge-rules';

@Entity('badge_definitions')
export class BadgeDefinitionEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@BeforeInsert()
	setIdIfMissing(): void {
		if (!this.id) {
			this.id = randomUUID();
		}
	}

	@Column({ type: 'varchar', length: 64, unique: true })
	code!: string;

	@Column({ type: 'varchar', length: 64 })
	icon!: string;

	@Column({ type: 'varchar', length: 150 })
	title!: string;

	@Column({ type: 'text' })
	description!: string;

	@Column({ type: 'boolean', default: true })
	active!: boolean;

	// AND-combined conditions evaluated against a user's live BadgeStats.
	@Column({ type: DATABASE_JSON_COLUMN_TYPE })
	rules!: BadgeRuleCondition[];

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;

	@UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	updatedAt!: Date;
}
