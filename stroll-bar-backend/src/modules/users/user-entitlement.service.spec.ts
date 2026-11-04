import { UserEntitlementService } from './user-entitlement.service';
import { PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import { UserRole } from './entities/user.entity';
import { StrollPublicityFlag } from '../strolls/entities/stroll.entity';

describe('UserEntitlementService', () => {
	const grantExpiresAt = new Date('2027-01-01T00:00:00.000Z');
	const paidGrant = {
		id: 'grant-1',
		plan: PaidPlan.CREATOR,
		startsAt: new Date('2026-01-01T00:00:00Z'),
		expiresAt: grantExpiresAt,
		status: PaidGrantStatus.ACTIVE,
		reason: 'Admin-only reason'
	};
	const grants = { find: jest.fn() };
	const users = { findOne: jest.fn() };
	const strolls = { count: jest.fn() };
	const purchaseQuery = {
		innerJoin: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		andWhere: jest.fn().mockReturnThis(),
		getCount: jest.fn()
	};
	const adventures = { createQueryBuilder: jest.fn(() => purchaseQuery) };
	let service: UserEntitlementService;

	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(new Date('2026-11-04T00:00:00Z'));
		jest.clearAllMocks();
		grants.find.mockResolvedValue([paidGrant]);
		users.findOne.mockResolvedValue({ id: 'user-1', role: UserRole.SIMPLE, isActive: true });
		strolls.count.mockResolvedValue(0);
		purchaseQuery.getCount.mockResolvedValue(0);
		service = new UserEntitlementService(users as never, grants as never, strolls as never, adventures as never);
	});

	afterEach(() => jest.useRealTimers());

	it('returns effective paid plan, separate quotas and a safe own-grant projection', async () => {
		strolls.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
		purchaseQuery.getCount.mockResolvedValueOnce(11).mockResolvedValueOnce(1);
		const result = await service.getForUser('user-1');
		expect(result).toMatchObject({
			plan: UserRole.CREATOR,
			paidThroughAt: grantExpiresAt.toISOString(),
			fallbackPlan: UserRole.SIMPLE,
			creationLimits: { public: 20, private: 3 },
			creationUsage: { public: 4, private: 2 },
			purchaseLimits: { public: null, private: null },
			purchaseUsage: { public: 11, private: 1 }
		});
		expect(result.paidGrants[0]).not.toHaveProperty('reason');
		expect(purchaseQuery.andWhere).toHaveBeenCalledWith('stroll.publicityFlag = :publicFlag', { publicFlag: StrollPublicityFlag.PUBLIC });
	});

	it('reports PREMIUM -> CREATOR at the premium boundary rather than a later SIMPLE date', async () => {
		grants.find.mockResolvedValue([
			paidGrant,
			{
				...paidGrant,
				id: 'premium',
				plan: PaidPlan.PREMIUM,
				expiresAt: new Date('2026-12-01T00:00:00Z')
			}
		]);
		expect(await service.getForUser('user-1')).toMatchObject({
			plan: UserRole.PREMIUM,
			paidThroughAt: '2026-12-01T00:00:00.000Z',
			fallbackPlan: UserRole.CREATOR
		});
	});

	it('keeps ADMIN independent while allowing it to view its own expiring grants', async () => {
		users.findOne.mockResolvedValue({ id: 'admin-1', role: UserRole.ADMIN, isActive: true });
		const result = await service.getForUser('admin-1');
		expect(result.plan).toBe(UserRole.ADMIN);
		expect(result.paidThroughAt).toBeNull();
		expect(result.fallbackPlan).toBeNull();
		expect(result.paidGrants).toHaveLength(1);
		expect(result.creationLimits).toEqual({ public: null, private: null });
	});
});
