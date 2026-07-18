import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_FLOAT_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

@Entity('stages')
@Index(['strollId', 'orderIndex'], { unique: true })
export class StageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: DATABASE_ID_COLUMN_TYPE })
  strollId!: string;

  @Column({ type: 'int' })
  orderIndex!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'simple-array', default: '' })
  imageUrls!: string[];

  @Column({ type: 'simple-array', default: '' })
  videoUrls!: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ type: DATABASE_FLOAT_COLUMN_TYPE, nullable: true })
  latitude?: number | null;

  @Column({ type: DATABASE_FLOAT_COLUMN_TYPE, nullable: true })
  longitude?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  riddleAnswer?: string | null;

  @CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
  createdAt!: Date;

  @UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
  updatedAt!: Date;
}
