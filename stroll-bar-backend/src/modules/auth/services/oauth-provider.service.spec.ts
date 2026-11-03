import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OAuthProviderService } from './oauth-provider.service';

describe('OAuth provider ownership proof', () => {
	let service: OAuthProviderService;
	let verifyJwt: jest.SpyInstance;

	beforeEach(() => {
		const config = {
			get: (key: string) => key.startsWith('OAUTH_') ? undefined : 'test-provider-config'
		} as unknown as ConfigService;
		service = new OAuthProviderService({} as JwtService, config);
		jest.spyOn(service as any, 'postForm').mockResolvedValue({ id_token: 'provider-signed-token', access_token: 'provider-token' });
		jest.spyOn(service as any, 'getAppleClientSecret').mockReturnValue('test-client-secret');
		verifyJwt = jest.spyOn(service as any, 'verifyProviderJwt');
	});

	it.each([
		[true, true], ['true', true], [false, false], ['false', false],
		[undefined, false], [null, false], [1, false], ['TRUE', false]
	])('Apple email_verified=%j is ownership proof only when explicitly true', async (claim, expected) => {
		verifyJwt.mockResolvedValue({ sub: 'provider-owner', email: 'owner@example.com', email_verified: claim });
		const profile = await service.fetchUserProfile('apple', 'code', 'verifier');
		expect(profile.emailVerified).toBe(expected);
		expect(verifyJwt).toHaveBeenCalledWith('provider-signed-token', expect.objectContaining({
			issuer: ['https://appleid.apple.com'], audience: 'test-provider-config'
		}));
	});

	it.each([true, false, undefined])('Google preserves the signed email verification claim (%s)', async (claim) => {
		verifyJwt.mockResolvedValue({ sub: 'provider-owner', email: 'owner@example.com', email_verified: claim });
		const profile = await service.fetchUserProfile('google', 'code', 'verifier');
		expect(profile.emailVerified).toBe(claim);
	});

	it('an invalid provider identity token never becomes an ownership profile', async () => {
		verifyJwt.mockRejectedValue(new UnauthorizedException('Invalid provider signature'));
		await expect(service.fetchUserProfile('apple', 'code', 'verifier')).rejects.toThrow(UnauthorizedException);
	});

	it('Facebook profile email is not affirmative mailbox ownership proof', async () => {
		jest.spyOn(service as any, 'getJson').mockResolvedValue({
			id: 'facebook-owner', email: 'owner@example.com', verified: true, is_verified: true
		});
		const profile = await service.fetchUserProfile('facebook', 'code', 'verifier');
		expect(profile).toMatchObject({ provider: 'facebook', email: 'owner@example.com', emailVerified: false });
		expect(verifyJwt).not.toHaveBeenCalled();
	});
});
