import { validateEnvironment } from './env.validation';

describe('Password reset environment validation', () => {
	const base = { NODE_ENV: 'test', JWT_SECRET: 'test-secret', JWT_REFRESH_SECRET: 'refresh-secret' };
	it.each(['0', '-1', '1.5', 'NaN', '1441'])('rejects invalid TTL %s', (ttl) => {
		expect(() => validateEnvironment({ ...base, PASSWORD_RESET_TOKEN_TTL_MINUTES: ttl })).toThrow('PASSWORD_RESET_TOKEN_TTL_MINUTES');
	});
	it.each(['javascript:alert(1)', 'https://user:password@example.com/auth/reset-password', 'not-a-url', 'https://example.com/other'])('rejects an unsafe destination %s', (url) => {
		expect(() => validateEnvironment({ ...base, PASSWORD_RESET_URL: url })).toThrow('PASSWORD_RESET_URL');
	});
	it.each(['https://example.com/auth/reset-password', 'https://example.com/app/#/auth/reset-password'])('accepts trusted path and hash URLs %s', (url) => {
		expect(() => validateEnvironment({ ...base, PASSWORD_RESET_URL: url })).not.toThrow();
	});
	it('rejects legacy token exposure in production', () => {
		expect(() => validateEnvironment({ ...base, NODE_ENV: 'production', AUTH_EXPOSE_RESET_TOKEN: 'true' })).toThrow('AUTH_EXPOSE_RESET_TOKEN');
	});
	it('requires email delivery in production', () => {
		expect(() => validateEnvironment({ ...base, NODE_ENV: 'production', PASSWORD_RESET_URL: 'https://example.com/#/auth/reset-password' })).toThrow('EMAIL_DELIVERY_ENABLED');
	});
	it('requires a reset URL when sending email', () => {
		expect(() => validateEnvironment({ ...base, EMAIL_DELIVERY_ENABLED: 'true' })).toThrow('PASSWORD_RESET_URL');
	});
});
