import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { SocialProfile } from '../services/oauth-provider.service';
import type { SocialAccountAction } from '../services/social-user.service';

@Entity('social_transactions')
export class SocialTransactionEntity {
	@PrimaryColumn({ type: 'varchar', length: 64 })
	id!: string;

	@Column({ type: 'varchar', length: 43 })
	browserChallenge!: string;

	@Index('IDX_social_transactions_expiresAt')
	@Column({ type: 'timestamptz' })
	expiresAt!: Date;

	@Column({ type: 'boolean', default: false })
	callbackConsumed!: boolean;

	@Column({ type: 'varchar', length: 64, nullable: true })
	handoffCodeHash!: string | null;

	@Column({ type: 'timestamptz', nullable: true })
	handoffExpiresAt!: Date | null;

	@Column({ type: 'jsonb', nullable: true })
	profile!: SocialProfile | null;

	@Column({ type: 'jsonb' })
	accountAction!: SocialAccountAction;
}
