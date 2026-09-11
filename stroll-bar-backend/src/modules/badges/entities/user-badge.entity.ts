import { randomUUID } from 'node:crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

@Entity('user_badges')
@Unique(['userId', 'badgeCode'])
@Index(['userId', 'earnedAt'])
export class UserBadgeEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@BeforeInsert()
	setIdIfMissing(): void {
		if (!this.id) {
			this.id = randomUUID();
		}
	}

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	userId!: string;

	@Column({ type: 'varchar', length: 64 })
	badgeCode!: string;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	earnedAt!: Date;
}
