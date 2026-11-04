import { UserEntitlementService } from './user-entitlement.service';
import { EffectiveRoleService } from './effective-role.service';
import { PaidGrantStatus } from './entities/paid-grant.entity';
import { UserRole } from './entities/user.entity';
import { StrollPublicityFlag } from '../strolls/entities/stroll.entity';

describe('UserEntitlementService', () => {
	const grantExpiresAt = new Date(Date.now() + 60_000);
	const grants = {
		find: jest.fn().mockResolvedValue([
			{ startsAt: new Date(Date.now() - 60_000), expiresAt: grantExpiresAt, status: PaidGrantStatus.ACTIVE }
		])
	};
	const users = { findOne: jest.fn() };
	const strolls = { count: jest.fn() };
	const purchaseQuery = {
		innerJoin: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		andWhere: jest.fn().mockReturnThis(),
		getCount: jest.fn()
	};
	const adventures = { createQueryBuilder: jest.fn(() => purchaseQuery) };
	const effectiveRoles = { resolve: jest.fn() };
	let service: UserEntitlementService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new UserEntitlementService(
			users as never,
			grants as never,
			strolls as never,
			adventures as never,
			effectiveRoles as unknown as EffectiveRoleService
		);
	});

	it('returns effective paid plan, paid-through date, separate quota limits and usage', async () => {
		users.findOne.mockResolvedValue({ id: 'user-1', role: UserRole.SIMPLE, isActive: true });
		effectiveRoles.resolve.mockResolvedValue(UserRole.CREATOR);
		strolls.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
		purchaseQuery.getCount.mockResolvedValueOnce(11).mockResolvedValueOnce(1);

		await expect(service.getForUser('user-1')).resolves.toEqual({
			plan: UserRole.CREATOR,
			paidThroughAt: grantExpiresAt.toISOString(),
			creationLimits: { public: 20, private: 3 },
			creationUsage: { public: 4, private: 2 },
			purchaseLimits: { public: null, private: null },
			purchaseUsage: { public: 11, private: 1 }
		});
		expect(grants.find).toHaveBeenCalledWith({
			where: { userId: 'user-1', status: expect.anything() }
		});
		expect(purchaseQuery.andWhere).toHaveBeenCalledWith(
			'stroll.publicityFlag = :publicFlag',
			{ publicFlag: StrollPublicityFlag.PUBLIC }
		);
	});

	it('keeps ADMIN independent of paid grants and shows unlimited quotas', async () => {
		users.findOne.mockResolvedValue({ id: 'admin-1', role: UserRole.ADMIN, isActive: true });
		effectiveRoles.resolve.mockResolvedValue(UserRole.ADMIN);
		strolls.count.mockResolvedValue(0);
		purchaseQuery.getCount.mockResolvedValue(0);

		const result = await service.getForUser('admin-1');

		expect(result.plan).toBe(UserRole.ADMIN);
		expect(result.paidThroughAt).toBeNull();
		expect(grants.find).not.toHaveBeenCalled();
		expect(result.creationLimits).toEqual({ public: null, private: null });
		expect(result.purchaseLimits).toEqual({ public: null, private: null });
	});
});
