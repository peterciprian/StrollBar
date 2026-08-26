import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DATABASE_DATE_COLUMN_TYPE } from '../../../database/column-types';
import { UserEntity } from '../../users/entities/user.entity';

export type SocialAuthProvider = 'apple' | 'google' | 'facebook' | 'twitter';

@Entity('social_auth_identities')
@Index(['provider', 'providerUserId'], { unique: true })
export class SocialIdentityEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: 'varchar', length: 32 })
	provider!: SocialAuthProvider;

	@Column({ type: 'varchar', length: 255 })
	providerUserId!: string;

	@Column({ type: 'uuid' })
	userId!: string;

	@ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user!: UserEntity;

	@Column({ type: 'varchar', length: 255, nullable: true })
	email?: string | null;

	@CreateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	createdAt!: Date;

	@UpdateDateColumn({ type: DATABASE_DATE_COLUMN_TYPE })
	updatedAt!: Date;
}
