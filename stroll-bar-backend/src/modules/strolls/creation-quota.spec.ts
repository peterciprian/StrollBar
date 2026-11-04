import { assertCreationQuota, assertQuotaTransition } from './creation-quota';
import { STROLL_CREATION_QUOTAS } from '../../common/utils/user-quotas';
import { UserRole } from '../users/entities/user.entity';
import { StrollPublicityFlag as Publicity } from './entities/stroll.entity';

describe('owned stroll creation quotas', () => {
	const simple = STROLL_CREATION_QUOTAS[UserRole.SIMPLE];
	const creator = STROLL_CREATION_QUOTAS[UserRole.CREATOR];

	it('preserves exact source quotas and unlimited ADMIN/PREMIUM', () => {
		expect(simple).toEqual({ public: 3, private: 0 });
		expect(creator).toEqual({ public: 20, private: 3 });
		for (const role of [UserRole.ADMIN, UserRole.PREMIUM]) {
			expect(() => assertQuotaTransition({ public: 10000, private: 10000 }, STROLL_CREATION_QUOTAS[role], Publicity.PRIVATE)).not.toThrow();
		}
	});

	it('allows creation below the limit and edits at the limit, but not creation at the limit', () => {
		expect(() => assertQuotaTransition({ public: 2, private: 0 }, simple, Publicity.PUBLIC)).not.toThrow();
		expect(() => assertQuotaTransition({ public: 3, private: 0 }, simple, Publicity.PUBLIC)).toThrow();
		expect(() => assertQuotaTransition({ public: 3, private: 0 }, simple, Publicity.PUBLIC, Publicity.PUBLIC)).not.toThrow();
	});

	it.each([Publicity.PRIVATE, Publicity.UNLISTED])('counts %s in the same private category', (publicity) => {
		expect(() => assertQuotaTransition({ public: 1, private: 0 }, simple, publicity, Publicity.PUBLIC)).toThrow();
		expect(() => assertQuotaTransition({ public: 1, private: 3 }, creator, publicity)).toThrow();
	});

	it('allows a corrective private-to-public edit after downgrade even if private excess remains', () => {
		expect(() => assertQuotaTransition({ public: 1, private: 4 }, simple, Publicity.PUBLIC, Publicity.PRIVATE)).not.toThrow();
	});

	it('rejects neutral edits and category swaps that shift excess to another category', () => {
		expect(() => assertQuotaTransition({ public: 1, private: 4 }, simple, Publicity.PRIVATE, Publicity.PRIVATE)).toThrow();
		expect(() => assertQuotaTransition({ public: 3, private: 4 }, simple, Publicity.PUBLIC, Publicity.PRIVATE)).toThrow();
		expect(() => assertQuotaTransition({ public: 4, private: 4 }, simple, Publicity.UNLISTED, Publicity.PRIVATE)).toThrow();
		expect(() => assertQuotaTransition({ public: 4, private: 0 }, simple, Publicity.PUBLIC)).toThrow();
	});

	it('counts by owner/category with no status exclusion', async () => {
		const repository = { count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(0) };
		await assertCreationQuota(repository as never, 'owner', UserRole.SIMPLE, Publicity.PUBLIC);
		expect(repository.count).toHaveBeenCalledTimes(2);
		for (const [options] of repository.count.mock.calls) {
			expect(options.where.authorId).toBe('owner');
			expect(options.where).not.toHaveProperty('activeStatus');
		}
	});
});
