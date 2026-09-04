import { randomUUID } from 'node:crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_FLOAT_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

// One row per completed adventure, recording the metrics shown on the result screen.
// Distinct from AchievementEntity, which represents earned badges rather than raw results.
@Entity('adventure_results')
@Index(['userId', 'strollId'])
export class AdventureResultEntity {
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

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	strollId!: string;

	@Column({ type: DATABASE_ID_COLUMN_TYPE, unique: true })
	adventureId!: string;

	@Column({ type: 'int', default: 0 })
	completedStageCount!: number;

	@Column({ type: 'int', default: 0 })
	elapsedSeconds!: number;

	@Column({ type: DATABASE_FLOAT_COLUMN_TYPE, default: 0 })
	routeLengthKm!: number;

	@Column({ type: DATABASE_DATE_COLUMN_TYPE })
	completedAt!: Date;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;
}
