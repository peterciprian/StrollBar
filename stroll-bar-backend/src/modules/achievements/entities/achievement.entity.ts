import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

@Entity('achievements')
export class AchievementEntity {
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

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ type: 'int', default: 0 })
  timeSeconds!: number;

  @Column({ type: 'int', default: 0 })
  hintsUsed!: number;

  @Column({ type: 'boolean', default: false })
  completed!: boolean;

  @Column({ type: DATABASE_DATE_COLUMN_TYPE, nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
  createdAt!: Date;

  @UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
  updatedAt!: Date;
}
