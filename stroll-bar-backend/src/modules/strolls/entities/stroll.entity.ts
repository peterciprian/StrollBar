import { randomUUID } from 'node:crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import {
	DATABASE_DATE_COLUMN_TYPE,
	DATABASE_FLOAT_COLUMN_TYPE,
	DATABASE_ID_COLUMN_TYPE,
	DATABASE_JSON_COLUMN_TYPE
} from '../../../database/column-types';
import { StrollCategory } from '../dto/stroll-category.enum';

export interface StrollPrice {
	amount: number;
	currency: string;
}

export enum StrollActiveStatus {
	DRAFT = 'draft',
	PUBLISHED = 'published',
	ARCHIVED = 'archived'
}

export enum StrollPublicityFlag {
	PUBLIC = 'public',
	UNLISTED = 'unlisted',
	PRIVATE = 'private'
}

export interface StrollMediaUrls {
	imageUrls: string[];
	videoUrls: string[];
}

@Entity('strolls')
@Index(['activeStatus', 'publicityFlag', 'createdAt'])
@Index(['authorId', 'createdAt'])
export class StrollEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@BeforeInsert()
	setIdIfMissing(): void {
		if (!this.id) {
			this.id = randomUUID();
		}
	}

	@Column({ type: 'varchar', length: 150 })
	name!: string;

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	authorId!: string;

	@Column({
		type: 'varchar',
		enum: StrollActiveStatus,
		default: StrollActiveStatus.DRAFT
	})
	activeStatus!: StrollActiveStatus;

	@Column({ type: 'simple-array', default: '' })
	labels!: string[];

	@Column({ type: 'simple-array', default: StrollCategory.HISTORICAL })
	category!: StrollCategory[];

	@Column({ type: 'text' })
	description!: string;

	@Column({ type: 'text', nullable: true })
	proposerText?: string | null;

	@Column({ type: DATABASE_JSON_COLUMN_TYPE, nullable: true })
	mediaUrls?: StrollMediaUrls | null;

	@Column({ type: DATABASE_JSON_COLUMN_TYPE, nullable: true })
	price?: StrollPrice | null;

	@Column({ type: DATABASE_FLOAT_COLUMN_TYPE, default: 0 })
	length!: number;

	@Column({
		type: 'varchar',
		enum: StrollPublicityFlag,
		default: StrollPublicityFlag.PRIVATE
	})
	publicityFlag!: StrollPublicityFlag;

	@Column({ type: 'int', default: 0 })
	stageCount!: number;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;

	@UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	updatedAt!: Date;
}
