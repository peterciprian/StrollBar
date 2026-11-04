import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { createHash, scryptSync } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError } from 'typeorm';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { SocialIdentityEntity } from '../entities/social-identity.entity';
import { PreferredLanguage, UserEntity, UserRole } from '../../users/entities/user.entity';
import { SocialAccountAction, SocialUserService } from './social-user.service';
import { SocialProfile } from './oauth-provider.service';

const password = 'PreparedPassword123!';
const salt = '0123456789abcdef0123456789abcdef';
const preparedHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const profile: SocialProfile = {
	provider: 'google', providerUserId: 'owner-provider-id', email: 'owner@example.com',
	emailVerified: true, profileImageUrl: 'https://example.com/owner.png'
};
const reclaim: SocialAccountAction = { intent: 'reclaim', email: profile.email! };

describe('SocialUserService account ownership', () => {
	let users: UserEntity[];
	let identities: SocialIdentityEntity[];
	let usersRepository: any;
	let identitiesRepository: any;
	let transaction: jest.Mock;
	let issueTokens: jest.Mock;
	let service: SocialUserService;

	function registration(overrides: Partial<UserEntity> = {}): UserEntity {
		return {
			id: 'registration', email: profile.email!, username: 'prepared', isActive: true,
			role: UserRole.SIMPLE, preferredLanguage: PreferredLanguage.EN, emailVerified: false,
			passwordHash: preparedHash, authVersion: 3, refreshTokenHash: 'prepared-refresh',
			resetPasswordTokenHash: 'prepared-reset', resetPasswordExpiresAt: new Date(Date.now() + 60_000),
			emailVerificationTokenHash: 'prepared-verification', emailVerificationExpiresAt: new Date(Date.now() + 60_000),
			profileImageUrl: 'https://example.com/prepared.png', createdAt: new Date(), updatedAt: new Date(),
			...overrides
		} as UserEntity;
	}

	function linkAction(user: UserEntity): SocialAccountAction {
		return {
			intent: 'link', userId: user.id, authVersion: user.authVersion,
			credentialFingerprint: createHash('sha256').update(user.passwordHash).digest('hex')
		};
	}

	function snapshot() {
		return structuredClone({ users, identities });
	}

	async function rejectUnchanged(action: SocialAccountAction, suppliedProfile = profile, error = UnauthorizedException) {
		const before = snapshot();
		await expect(service.findOrCreateUserFromProfile(suppliedProfile, issueTokens, action)).rejects.toThrow(error);
		expect({ users, identities }).toEqual(before);
		expect(usersRepository.save).not.toHaveBeenCalled();
		expect(identitiesRepository.save).not.toHaveBeenCalled();
		expect(identitiesRepository.delete).not.toHaveBeenCalled();
		expect(issueTokens).not.toHaveBeenCalled();
	}

	beforeEach(() => {
		users = [registration()];
		identities = [];
		const matches = (item: any, where: any) => Object.entries(where).every(([key, value]) => item[key] === value);
		usersRepository = {
			findOne: jest.fn(async ({ where }) => structuredClone(users.find((u) => matches(u, where)) ?? null)),
			create: jest.fn((value) => ({ id: 'new-user', authVersion: 0, ...value })),
			save: jest.fn(async (value) => {
				const index = users.findIndex((u) => u.id === value.id);
				if (index === -1) users.push(value);
				else users[index] = value;
				return structuredClone(value);
			}),
			update: jest.fn(async (where, changes) => {
				const user = users.find((u) => matches(u, where));
				if (!user) return { affected: 0 };
				Object.assign(user, changes);
				return { affected: 1 };
			})
		};
		identitiesRepository = {
			findOne: jest.fn(async ({ where }) => structuredClone(identities.find((i) => matches(i, where)) ?? null)),
			create: jest.fn((value) => value),
			save: jest.fn(async (value) => { identities.push(value); return value; }),
			delete: jest.fn(async (where) => { identities = identities.filter((i) => !matches(i, where)); })
		};
		transaction = jest.fn(async (run) => {
			const before = snapshot();
			try {
				return await run({ getRepository: (entity: unknown) => entity === UserEntity ? usersRepository : identitiesRepository });
			} catch (error) {
				users = before.users;
				identities = before.identities;
				throw error;
			}
		});
		usersRepository.manager = { transaction };
		issueTokens = jest.fn(async (user) => {
			expect(transaction).toHaveReturned();
			return { accessToken: 'access', refreshToken: 'refresh', user };
		});
		service = new SocialUserService(usersRepository);
	});

	it.each([true, false])('email equality never links a registration (emailVerified=%s) on ordinary login', async (emailVerified) => {
		users[0].emailVerified = emailVerified;
		await rejectUnchanged({ intent: 'login' }, profile, ConflictException);
	});

	it('an inactive email collision is not a new signup or a link', async () => {
		users[0].isActive = false;
		await rejectUnchanged({ intent: 'login' }, profile, ConflictException);
	});

	it.each([false, undefined])('an unverified provider email (%s) cannot bypass a collision', async (emailVerified) => {
		users[0].emailVerified = true;
		await rejectUnchanged({ intent: 'login' }, { ...profile, emailVerified }, ConflictException);
	});

	it('requires the requested verified email for reclamation, not another mailbox', async () => {
		users.push(registration({ id: 'other', email: 'other@example.com' }));
		await rejectUnchanged(reclaim, { ...profile, email: 'other@example.com' });
	});

	it.each([false, undefined])('does not trust emailVerified=%s as ownership proof', async (emailVerified) => {
		await rejectUnchanged(reclaim, { ...profile, emailVerified });
	});

	it('requires a provider email for reclamation', async () => {
		await rejectUnchanged(reclaim, { ...profile, email: undefined });
	});

	it.each([
		{ emailVerified: true }, { isActive: false }, { role: UserRole.ADMIN }, { passwordHash: 'social-only-random-secret' }
	])('rejects ineligible reclamation without changing state: %j', async (changes) => {
		Object.assign(users[0], changes);
		await rejectUnchanged(reclaim, profile, ConflictException);
	});

	it('rejects reclamation when the identity is owned by a different account', async () => {
		identities.push({ ...profile, userId: 'other' } as unknown as SocialIdentityEntity);
		await rejectUnchanged(reclaim, profile, ConflictException);
	});

	it('reclaims atomically, removing every prepared authentication route before issuing tokens', async () => {
		identities.push(
			{ provider: 'facebook', providerUserId: 'attacker-1', userId: users[0].id } as SocialIdentityEntity,
			{ provider: 'twitter', providerUserId: 'attacker-2', userId: users[0].id } as SocialIdentityEntity,
			{ provider: 'google', providerUserId: 'unrelated', userId: 'other' } as SocialIdentityEntity
		);
		await service.findOrCreateUserFromProfile(profile, issueTokens, reclaim);
		expect(users[0]).toMatchObject({
			id: 'registration', emailVerified: true, authVersion: 4, refreshTokenHash: null,
			resetPasswordTokenHash: null, resetPasswordExpiresAt: null,
			emailVerificationTokenHash: null, emailVerificationExpiresAt: null,
			profileImageUrl: profile.profileImageUrl
		});
		expect(users[0].passwordHash).not.toBe(preparedHash);
		expect(users[0].passwordHash).not.toContain(':');
		expect(identities).toEqual([
			expect.objectContaining({ providerUserId: 'unrelated', userId: 'other' }),
			expect.objectContaining({ providerUserId: profile.providerUserId, userId: 'registration', email: profile.email })
		]);
		expect(usersRepository.findOne).toHaveBeenCalledWith({
			where: { email: profile.email }, lock: { mode: 'pessimistic_write' }
		});
		expect(issueTokens).toHaveBeenCalledWith(expect.objectContaining({ authVersion: 4 }));
	});

	it('rolls back credential clearing and identity deletion when the new identity cannot be saved', async () => {
		identities.push({ provider: 'facebook', providerUserId: 'prepared', userId: 'registration' } as SocialIdentityEntity);
		const before = snapshot();
		identitiesRepository.save.mockRejectedValue(new Error('database write failed'));
		await expect(service.findOrCreateUserFromProfile(profile, issueTokens, reclaim)).rejects.toThrow('database write failed');
		expect({ users, identities }).toEqual(before);
		expect(issueTokens).not.toHaveBeenCalled();
	});

	it('a concurrent uniqueness conflict rolls back and returns actionable guidance, not database details', async () => {
		const before = snapshot();
		identitiesRepository.save.mockRejectedValue(new QueryFailedError('insert identity', [], Object.assign(new Error('private database details'), { code: '23505' })));
		await expect(service.findOrCreateUserFromProfile(profile, issueTokens, reclaim)).rejects.toThrow(
			'This email, username or provider identity is already in use. Sign in, explicitly link, or use account recovery.'
		);
		expect({ users, identities }).toEqual(before);
		expect(issueTokens).not.toHaveBeenCalled();
	});

	it('does not permit reclaiming an already reclaimed account', async () => {
		await service.findOrCreateUserFromProfile(profile, issueTokens, reclaim);
		const before = snapshot();
		issueTokens.mockClear();
		await expect(service.findOrCreateUserFromProfile(profile, issueTokens, reclaim)).rejects.toThrow(ConflictException);
		expect({ users, identities }).toEqual(before);
		expect(issueTokens).not.toHaveBeenCalled();
	});

	it('explicit linking preserves established credentials and unrelated identities', async () => {
		users[0].emailVerified = true;
		identities.push({ provider: 'facebook', providerUserId: 'legitimate-existing', userId: users[0].id } as SocialIdentityEntity);
		const before = snapshot();
		await service.findOrCreateUserFromProfile(profile, issueTokens, linkAction(users[0]));
		expect(users).toEqual(before.users);
		expect(identities).toEqual([
			...before.identities, expect.objectContaining({ userId: users[0].id, providerUserId: profile.providerUserId })
		]);
		expect(usersRepository.save).not.toHaveBeenCalled();
		expect(identitiesRepository.delete).not.toHaveBeenCalled();
	});

	it('rejects explicit linking to an unverified registration even with its prepared password', async () => {
		await rejectUnchanged(linkAction(users[0]));
	});

	it.each([false, undefined])('explicit linking needs verified provider proof (%s)', async (emailVerified) => {
		users[0].emailVerified = true;
		await rejectUnchanged(linkAction(users[0]), { ...profile, emailVerified });
	});

	it('rejects mismatched provider email for explicit linking', async () => {
		users[0].emailVerified = true;
		await rejectUnchanged(linkAction(users[0]), { ...profile, email: 'other@example.com' });
	});

	it('rejects linking another account provider identity', async () => {
		users[0].emailVerified = true;
		identities.push({ ...profile, userId: 'other' } as unknown as SocialIdentityEntity);
		await rejectUnchanged(linkAction(users[0]), profile, ConflictException);
	});

	it.each(['missing', 'inactive', 'version', 'password'])('rejects stale/invalid link authorization: %s', async (reason) => {
		users[0].emailVerified = true;
		const action = linkAction(users[0]);
		if (reason === 'missing') users = [];
		if (reason === 'inactive') users[0].isActive = false;
		if (reason === 'version') users[0].authVersion++;
		if (reason === 'password') users[0].passwordHash = 'changed-password';
		await rejectUnchanged(action);
	});

	it('existing identities sign in without matching or changing account email', async () => {
		identities.push({ provider: profile.provider, providerUserId: profile.providerUserId, userId: users[0].id } as SocialIdentityEntity);
		const before = snapshot();
		await service.findOrCreateUserFromProfile({ ...profile, email: 'changed@example.com', emailVerified: false }, issueTokens);
		expect({ users, identities }).toEqual(before);
		expect(issueTokens).toHaveBeenCalledWith(expect.objectContaining({ id: 'registration' }));
	});

	it('an inactive linked identity is not signed in or recreated', async () => {
		users[0].isActive = false;
		identities.push({ provider: profile.provider, providerUserId: profile.providerUserId, userId: users[0].id } as SocialIdentityEntity);
		await rejectUnchanged({ intent: 'login' });
	});

	it('preserves profile-image filling for an already linked identity', async () => {
		users[0].profileImageUrl = null;
		identities.push({ provider: profile.provider, providerUserId: profile.providerUserId, userId: users[0].id } as SocialIdentityEntity);
		await service.findOrCreateUserFromProfile(profile, issueTokens);
		expect(users[0].profileImageUrl).toBe(profile.profileImageUrl);
		expect(identitiesRepository.save).not.toHaveBeenCalled();
	});

	it('does not issue tokens for an identity removed while waiting on the user lock', async () => {
		identitiesRepository.findOne.mockResolvedValueOnce({ userId: users[0].id }).mockResolvedValueOnce(null);
		await rejectUnchanged({ intent: 'login' });
	});

	it.each([true, false, undefined])('safe new signup (emailVerified=%s)', async (emailVerified) => {
		users = [];
		await service.findOrCreateUserFromProfile({ ...profile, emailVerified }, issueTokens);
		expect(users[0].emailVerified).toBe(emailVerified === true);
		expect(users[0].email).toEqual(emailVerified === true ? profile.email : expect.stringMatching(/@socialuser\.local$/));
		expect(identities).toHaveLength(1);
	});

	it('supports provider signup without email', async () => {
		users = [];
		await service.findOrCreateUserFromProfile({ provider: 'twitter', providerUserId: 'no-mail' }, issueTokens);
		expect(users[0]).toMatchObject({ emailVerified: false, email: expect.stringMatching(/@socialuser\.local$/) });
	});

	it('the original password, refresh token, JWT and stale token issuance fail after reclamation', async () => {
		const original = structuredClone(users[0]);
		await service.findOrCreateUserFromProfile(profile, issueTokens, reclaim);
		const config = { get: () => 'secret', getOrThrow: () => 'secret' } as unknown as ConfigService;
		const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: original.id, authVersion: original.authVersion }), sign: jest.fn(() => 'token') };
		const effectiveRoles = { resolve: jest.fn().mockResolvedValue(UserRole.SIMPLE) } as any;
		const auth = new AuthService(usersRepository, identitiesRepository, jwt as unknown as JwtService, config, {} as any, {} as any, service, {} as any, effectiveRoles);
		await expect(auth.login({ email: original.email, password })).rejects.toThrow(UnauthorizedException);
		await expect(auth.refresh('prepared-refresh')).rejects.toThrow(UnauthorizedException);
		await expect(new JwtStrategy(config, usersRepository, effectiveRoles).validate({
			sub: original.id, email: original.email, username: original.username, authVersion: original.authVersion
		})).rejects.toThrow(UnauthorizedException);
		await expect((auth as any).issueTokens(original)).rejects.toThrow(UnauthorizedException);
		expect(users[0].refreshTokenHash).toBeNull();
	});
});
