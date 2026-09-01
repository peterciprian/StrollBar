import { randomUUID } from 'node:crypto';
import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE } from '../../../database/column-types';

@Entity('users')
export class UserEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@BeforeInsert()
	setIdIfMissing(): void {
		if (!this.id) {
			this.id = randomUUID();
		}
	}

	@Column({ type: 'varchar', length: 50, unique: true })
	username!: string;

	@Column({ type: 'varchar', length: 255, unique: true })
	email!: string;

	@Column({ type: 'varchar', length: 255 })
	passwordHash!: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	refreshTokenHash?: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	resetPasswordTokenHash?: string | null;

	@Column({ type: DATABASE_DATE_COLUMN_TYPE, nullable: true })
	resetPasswordExpiresAt?: Date | null;

	@Column({ type: 'varchar', length: 2048, nullable: true })
	profileImageUrl?: string | null;

	@Column({ type: 'boolean', default: true })
	isActive!: boolean;

	@Column({ type: 'boolean', default: false })
	emailVerified!: boolean;

	@Column({ type: 'varchar', length: 255, nullable: true })
	emailVerificationTokenHash?: string | null;

	@Column({ type: DATABASE_DATE_COLUMN_TYPE, nullable: true })
	emailVerificationExpiresAt?: Date | null;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;

	@UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	updatedAt!: Date;
}
