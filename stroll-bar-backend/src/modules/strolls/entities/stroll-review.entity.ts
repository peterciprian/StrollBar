import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

@Entity('stroll_reviews')
@Index(['strollId', 'createdAt'])
@Index(['strollId', 'userId'], { unique: true })
export class StrollReviewEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	strollId!: string;

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	userId!: string;

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	adventureId!: string;

	@Column({ type: 'int' })
	rating!: number;

	@Column({ type: 'text', nullable: true })
	comment?: string | null;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;

	@UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	updatedAt!: Date;
}
