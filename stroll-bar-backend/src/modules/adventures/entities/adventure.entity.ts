import { randomUUID } from 'node:crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

export enum AdventureProgressStatus {
	PURCHASED = 'purchased',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	ABANDONED = 'abandoned'
}

@Entity('adventures')
@Index(['ownerUserId', 'updatedAt'])
@Index(['ownerUserId', 'progressStatus'])
@Index(['strollId', 'progressStatus'])
export class AdventureEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@BeforeInsert()
	setIdIfMissing(): void {
		if (!this.id) {
			this.id = randomUUID();
		}
	}

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	ownerUserId!: string;

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	strollId!: string;

	@Column({ type: DATABASE_DATE_COLUMN_TYPE })
	purchaseTime!: Date;

	@Column({ type: DATABASE_DATE_COLUMN_TYPE, nullable: true })
	startDateTime?: Date | null;

	@Column({ type: DATABASE_DATE_COLUMN_TYPE, nullable: true })
	completionDateTime?: Date | null;

	@Column({
		type: 'varchar',
		enum: AdventureProgressStatus,
		default: AdventureProgressStatus.PURCHASED
	})
	progressStatus!: AdventureProgressStatus;

	@Column({ type: 'int', default: 1 })
	currentStageIndex!: number;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;

	@UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	updatedAt!: Date;
}
