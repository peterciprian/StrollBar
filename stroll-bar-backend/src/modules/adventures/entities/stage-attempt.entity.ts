import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';

@Entity('stage_attempts')
export class StageAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @BeforeInsert()
  setIdIfMissing(): void {
    if (!this.id) {
      this.id = randomUUID();
    }
  }

  @Column({ type: DATABASE_ID_COLUMN_TYPE })
  adventureId!: string;

  @Column({ type: DATABASE_ID_COLUMN_TYPE })
  stageId!: string;

  @Column({ type: 'varchar', length: 255 })
  providedAnswer!: string;

  @Column({ type: 'boolean' })
  isCorrect!: boolean;

  @CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
  attemptedAt!: Date;
}
