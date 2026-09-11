import { randomUUID } from 'node:crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

@Entity('stroll_reports')
@Index(['strollId', 'createdAt'])
export class StrollReportEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@BeforeInsert()
	setIdIfMissing(): void {
		if (!this.id) {
			this.id = randomUUID();
		}
	}

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	strollId!: string;

	@Column({ type: DATABASE_ID_COLUMN_TYPE })
	reporterUserId!: string;

	@Column({ type: 'varchar', length: 300 })
	message!: string;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;
}
