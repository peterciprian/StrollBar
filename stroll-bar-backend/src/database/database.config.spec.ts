import { buildDatabaseOptions } from './database.config';

describe('buildDatabaseOptions', () => {
	it('registers every migration in chronological order', () => {
		const options = buildDatabaseOptions();
		const migrations = Array.isArray(options.migrations) ? options.migrations : [];
		const migrationNames = migrations.map((migration) => (typeof migration === 'function' ? migration.name : String(migration)));

		expect(migrationNames).toEqual([
			'InitialSchema1752864000000',
			'AuthTokensAndPasswordReset1752885000000',
			'MediaAssets1752896000000',
			'SocialAuthIdentities1752907000000',
			'EmailVerification1752918000000',
			'UserRoles1752929000000',
			'QueryPerformanceIndexes1753000000000',
			'AuditEvents1753100000000',
			'StrollCategoryPriceLength1753200000000',
			'AdventureResults1753300000000',
			'StrollReviews1753400000000'
		]);
	});
});
