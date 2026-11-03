import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { SocialIdentityEntity } from '../entities/social-identity.entity';
import { UserEntity, UserRole } from '../../users/entities/user.entity';
import type { SocialProfile } from './oauth-provider.service';

type SafeUser = Pick<UserEntity, 'id' | 'username' | 'email' | 'profileImageUrl' | 'isActive' | 'role' | 'emailVerified' | 'createdAt' | 'updatedAt'>;
type AuthResponse = { accessToken: string; refreshToken: string; user: SafeUser };
export type SocialAccountAction =
	| { intent: 'login' }
	| { intent: 'reclaim'; email: string }
	| { intent: 'link'; userId: string; authVersion: number; credentialFingerprint: string };

@Injectable()
export class SocialUserService {
	private readonly logger = new Logger(SocialUserService.name);

	constructor(
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>
	) {}

	async findOrCreateUserFromProfile(
		profile: SocialProfile,
		issueTokensCallback: (user: UserEntity) => Promise<AuthResponse>,
		action: SocialAccountAction = { intent: 'login' }
	): Promise<AuthResponse> {
		const user = await this.usersRepository.manager.transaction(async (manager) => {
			const users = manager.getRepository(UserEntity);
			const identities = manager.getRepository(SocialIdentityEntity);
			const identityKey = { provider: profile.provider, providerUserId: profile.providerUserId };
			const identity = await identities.findOne({ where: identityKey });
			const verifiedEmail = profile.email && profile.emailVerified === true ? profile.email : undefined;
			let user: UserEntity;

			if (action.intent === 'link') {
				const target = await users.findOne({ where: { id: action.userId }, lock: { mode: 'pessimistic_write' } });
				if (!target?.isActive || !target.emailVerified || target.authVersion !== action.authVersion ||
					createHash('sha256').update(target.passwordHash).digest('hex') !== action.credentialFingerprint) {
					throw new UnauthorizedException('Link authorization expired. Sign in and reauthenticate again.');
				}
				if (!verifiedEmail || target.email !== verifiedEmail) {
					throw new UnauthorizedException('Linking requires the provider to verify the same email as your account.');
				}
				if (identity && identity.userId !== target.id) {
					throw new ConflictException('This provider identity is already linked to another account.');
				}
				user = target;
			} else if (action.intent === 'reclaim') {
				if (!verifiedEmail || verifiedEmail !== action.email) {
					throw new UnauthorizedException('Reclamation requires the provider to verify the requested email. Use email password recovery instead.');
				}
				const target = await users.findOne({ where: { email: verifiedEmail }, lock: { mode: 'pessimistic_write' } });
				// Only active, unverified, ordinary local registrations are reclaimable.
				if (!target?.isActive || target.emailVerified || target.role !== UserRole.SIMPLE ||
					!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(target.passwordHash)) {
					throw new ConflictException('No eligible unverified registration. Sign in and explicitly link, or use password recovery.');
				}
				if (identity && identity.userId !== target.id) {
					throw new ConflictException('This provider identity is already linked to another account.');
				}
				user = await users.save({
					...target,
					passwordHash: randomBytes(48).toString('hex'),
					authVersion: target.authVersion + 1,
					refreshTokenHash: null,
					resetPasswordTokenHash: null,
					resetPasswordExpiresAt: null,
					emailVerificationTokenHash: null,
					emailVerificationExpiresAt: null,
					emailVerified: true,
					profileImageUrl: profile.profileImageUrl ?? null
				});
				await identities.delete({ userId: target.id });
			} else if (identity) {
				const target = await users.findOne({ where: { id: identity.userId }, lock: { mode: 'pessimistic_write' } });
				// Recheck after locking: reclamation may have removed this identity while we waited.
				const currentIdentity = await identities.findOne({ where: identityKey });
				if (!target?.isActive || currentIdentity?.userId !== target.id) {
					throw new UnauthorizedException('This social session is no longer valid. Sign in again.');
				}
				user = target;
			} else {
				// Even an unverified provider email must not silently match an existing account.
				const existing = profile.email ? await users.findOne({ where: { email: profile.email } }) : null;
				if (existing) {
					throw new ConflictException('An account already uses this email. Sign in and explicitly link this provider, or reclaim an unverified registration with verified provider email. Password recovery is also available.');
				}
				user = await this.createUserFromProfile(profile, users);
			}

			if (!user.profileImageUrl && profile.profileImageUrl) {
				await users.update({ id: user.id }, { profileImageUrl: profile.profileImageUrl });
				user.profileImageUrl = profile.profileImageUrl;
			}
			if (!identity || action.intent === 'reclaim') {
				await identities.save(identities.create({ ...identityKey, userId: user.id, email: verifiedEmail ?? null }));
			}
			return user;
		}).catch((error: unknown) => {
			this.logger.warn({ event: 'social_account_rejected', intent: action.intent, provider: profile.provider });
			if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
				throw new ConflictException('This email, username or provider identity is already in use. Sign in, explicitly link, or use account recovery.');
			}
			throw error;
		});

		this.logger.log({ event: 'social_account_authorized', intent: action.intent, provider: profile.provider, userId: user.id });
		// AuthService uses a credential/version predicate, rejecting stale snapshots after reclamation.
		return issueTokensCallback(user);
	}

	private async createUserFromProfile(profile: SocialProfile, users: Repository<UserEntity>): Promise<UserEntity> {
		const base = (profile.displayName || profile.username || `${profile.provider}_user`)
			.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'user';
		const suffix = createHash('sha256').update(profile.providerUserId).digest('hex');
		let username = `${base}_${suffix.slice(0, 8)}`;
		if (await users.findOne({ where: { username } })) {
			username = `${profile.provider}_${suffix.slice(0, 12)}`;
		}
		const emailVerified = !!profile.email && profile.emailVerified === true;
		return users.save(users.create({
			username,
			email: emailVerified ? profile.email! : `${profile.provider}+${suffix}@socialuser.local`,
			passwordHash: randomBytes(48).toString('hex'),
			profileImageUrl: profile.profileImageUrl ?? null,
			isActive: true,
			role: UserRole.SIMPLE,
			emailVerified
		}));
	}
}
