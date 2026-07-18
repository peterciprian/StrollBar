import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE, DATABASE_ID_COLUMN_TYPE } from '../../../database/column-types';
import { MediaUploadPurpose } from '../dto/create-presigned-upload.dto';

export enum MediaUploadStatus {
  PENDING = 'pending',
  UPLOADED = 'uploaded',
  ABORTED = 'aborted',
  FAILED = 'failed',
}

export enum MediaUploadMode {
  SINGLE_PART = 'single_part',
  MULTIPART = 'multipart',
}

@Entity('media_assets')
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: DATABASE_ID_COLUMN_TYPE })
  uploadedByUserId!: string;

  @Column({ type: DATABASE_ID_COLUMN_TYPE, nullable: true })
  strollId?: string | null;

  @Column({ type: DATABASE_ID_COLUMN_TYPE, nullable: true })
  stageId?: string | null;

  @Column({ type: DATABASE_ID_COLUMN_TYPE, nullable: true })
  profileUserId?: string | null;

  @Column({ type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({ type: 'varchar', length: 2048 })
  publicUrl!: string;

  @Column({ type: 'varchar', length: 100 })
  contentType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 32 })
  purpose!: MediaUploadPurpose;

  @Column({ type: 'varchar', length: 32, default: MediaUploadStatus.PENDING })
  uploadStatus!: MediaUploadStatus;

  @Column({ type: 'varchar', length: 32, default: MediaUploadMode.SINGLE_PART })
  uploadMode!: MediaUploadMode;

  @Column({ type: 'varchar', length: 255, nullable: true })
  multipartUploadId?: string | null;

  @CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
  createdAt!: Date;

  @UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
  updatedAt!: Date;
}
