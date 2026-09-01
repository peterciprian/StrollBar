import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { SocialIdentityEntity, SocialAuthProvider } from '../entities/social-identity.entity';
import { UserEntity } from '../../users/entities/user.entity';
import type { SocialProfile } from './oauth-provider.service';

type SafeUser = Pick<UserEntity, 'id' | 'username' | 'email' | 'profileImageUrl' | 'isActive' | 'role' | 'emailVerified' | 'createdAt' | 'updatedAt'>;
type AuthResponse = { accessToken: string; refreshToken: string; user: SafeUser };

/**
 * Handles social profile login flows: linking profiles to existing users,
 * creating new users from social profiles, and managing social identities.
 * Reduces the complexity of the main auth service.
 */
@Injectable()
export class SocialUserService {
	constructor(
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>,
		@InjectRepository(SocialIdentityEntity)
		private readonly socialIdentitiesRepository: Repository<SocialIdentityEntity>
	) {}

	/**
	 * Find or create a user from a social profile and issue authentication tokens.
	 * This method orchestrates the social login flow: looking up existing identities,
	 * matching emails, creating new users if needed, and updating profile images.
	 */
	async findOrCreateUserFromProfile(
		profile: SocialProfile,
		issueTokensCallback: (user: UserEntity) => Promise<AuthResponse>
	): Promise<AuthResponse> {
		const identity = await this.socialIdentitiesRepository.findOne({
			where: { provider: profile.provider, providerUserId: profile.providerUserId },
			relations: { user: true }
		});

		let user = identity?.user;

		if (user && !user.isActive) {
			throw new UnauthorizedException('This account is inactive.');
		}

		// If no existing identity, try matching by email if the provider verified it
		if (!user && profile.email && profile.emailVerified !== false) {
			user = (await this.usersRepository.findOne({ where: { email: profile.email, isActive: true } })) ?? undefined;
		}

		// Create a new user if we don't have one
		if (!user) {
			user = await this.createUserFromProfile(profile);
		} else if (!user.profileImageUrl && profile.profileImageUrl) {
			// Update profile image if the provider provided one and the user doesn't have one
			user.profileImageUrl = profile.profileImageUrl;
			user = await this.usersRepository.save(user);
		}

		// Link the social identity to the user if not already linked
		if (!identity) {
			await this.socialIdentitiesRepository.save(
				this.socialIdentitiesRepository.create({
					provider: profile.provider,
					providerUserId: profile.providerUserId,
					userId: user.id,
					email: profile.email ?? null
				})
			);
		}

		return issueTokensCallback(user);
	}

	/**
	 * Create a new user from a social profile.
	 * Generates a unique username based on the provider profile data.
	 */
	private async createUserFromProfile(profile: SocialProfile): Promise<UserEntity> {
		const username = await this.createUniqueSocialUsername(profile);
		const email = profile.email ?? this.createSyntheticSocialEmail(profile);

		const user = this.usersRepository.create({
			username,
			email,
			passwordHash: this.hashRandomPassword(),
			profileImageUrl: profile.profileImageUrl ?? null,
			isActive: true,
			// The provider already verified the email address, so no extra verification step is needed.
			emailVerified: !!profile.email && profile.emailVerified !== false
		});

		return this.usersRepository.save(user);
	}

	/**
	 * Generate a unique username from a social profile.
	 * Uses a deterministic hash-based approach to avoid repeated database queries.
	 */
	private async createUniqueSocialUsername(profile: SocialProfile): Promise<string> {
		// Try the display name or username from the provider first
		const baseUsername = profile.displayName || profile.username || `${profile.provider}_user`;
		const normalizedBase =
			baseUsername
				.toLowerCase()
				.replace(/[^a-z0-9_-]/g, '')
				.slice(0, 20) || `user`;

		// Generate a deterministic suffix from the provider ID
		const suffix = this.hashUserId(profile.providerUserId).slice(0, 8);
		const uniqueUsername = `${normalizedBase}_${suffix}`;

		// Check if it's available; if not, fall back to a simpler scheme
		const existingUser = await this.usersRepository.findOne({ where: { username: uniqueUsername } });

		if (!existingUser) {
			return uniqueUsername;
		}

		// Fallback: use provider + hash
		return `${profile.provider}_${this.hashUserId(profile.providerUserId).slice(0, 12)}`;
	}

	private createSyntheticSocialEmail(profile: SocialProfile): string {
		return `${profile.provider}+${this.hashUserId(profile.providerUserId)}@socialuser.local`;
	}

	private hashRandomPassword(): string {
		// Create a random password hash for users who log in via social.
		// These users can reset their password via the forgot password flow if needed.
		return randomBytes(48).toString('hex');
	}

	private hashUserId(providerId: string): string {
		const crypto = require('node:crypto');
		return crypto.createHash('sha256').update(providerId).digest('hex');
	}
}
