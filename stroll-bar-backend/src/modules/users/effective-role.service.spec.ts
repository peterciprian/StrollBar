import { EffectiveRoleService } from './effective-role.service';
import { PaidGrantEntity, PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import { UserRole } from './entities/user.entity';

describe('ROLE-02 effective role', () => {
	const startsAt = new Date('2026-11-04T12:00:00.000Z');
	const expiresAt = new Date('2026-12-04T12:00:00.000Z');
	let grants: PaidGrantEntity[];
	const repository = { find: jest.fn(async () => grants) };
	const service = new EffectiveRoleService(repository as never);
	const user = { id: 'user', role: UserRole.SIMPLE };

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(startsAt);
		jest.clearAllMocks();
		grants = [Object.assign(new PaidGrantEntity(), {
			plan: PaidPlan.CREATOR, status: PaidGrantStatus.ACTIVE, startsAt, expiresAt
		})];
	});
	afterEach(() => jest.useRealTimers());

	it.each([
		['before start', startsAt.getTime() - 1, UserRole.SIMPLE],
		['exact start', startsAt.getTime(), UserRole.CREATOR],
		['just before expiry', expiresAt.getTime() - 1, UserRole.CREATOR],
		['exact expiry', expiresAt.getTime(), UserRole.SIMPLE],
		['after expiry', expiresAt.getTime() + 1, UserRole.SIMPLE]
	])('%s uses the half-open UTC period', async (_label, time, role) => {
		jest.setSystemTime(time);
		await expect(service.resolve(user)).resolves.toBe(role);
	});

	it('selects PREMIUM over CREATOR regardless of grant ordering, then falls back to remaining CREATOR', async () => {
		grants.push(Object.assign(new PaidGrantEntity(), {
			plan: PaidPlan.PREMIUM, status: PaidGrantStatus.ACTIVE, startsAt,
			expiresAt: new Date(startsAt.getTime() + 1000)
		}));
		await expect(service.resolve(user)).resolves.toBe(UserRole.PREMIUM);
		grants.reverse();
		await expect(service.resolve(user)).resolves.toBe(UserRole.PREMIUM);
		jest.setSystemTime(startsAt.getTime() + 1000);
		await expect(service.resolve(user)).resolves.toBe(UserRole.CREATOR);
		jest.setSystemTime(expiresAt);
		await expect(service.resolve(user)).resolves.toBe(UserRole.SIMPLE);
	});

	it.each([PaidGrantStatus.ACTIVE, PaidGrantStatus.CANCELLED, PaidGrantStatus.SUSPENDED, PaidGrantStatus.REVOKED])(
		'handles %s without provider or scheduler state', async (status) => {
			grants[0].status = status;
			const expected = [PaidGrantStatus.ACTIVE, PaidGrantStatus.CANCELLED].includes(status) ? UserRole.CREATOR : UserRole.SIMPLE;
			await expect(service.resolve(user)).resolves.toBe(expected);
			jest.setSystemTime(expiresAt);
			await expect(service.resolve(user)).resolves.toBe(UserRole.SIMPLE);
		}
	);

	it.each([UserRole.CREATOR, UserRole.PREMIUM, UserRole.SIMPLE])('ignores stored legacy %s without an active grant', async (role) => {
		grants = [];
		await expect(service.resolve({ ...user, role })).resolves.toBe(UserRole.SIMPLE);
	});

	it('ADMIN is independent of paid plan, status and expiry', async () => {
		for (const time of [startsAt.getTime() - 1, startsAt.getTime(), expiresAt.getTime(), expiresAt.getTime() + 1]) {
			jest.setSystemTime(time);
			await expect(service.resolve({ ...user, role: UserRole.ADMIN })).resolves.toBe(UserRole.ADMIN);
		}
		expect(repository.find).not.toHaveBeenCalled();
	});

	it('reloads grant state on every read and fails closed on database failure', async () => {
		await expect(service.resolve(user)).resolves.toBe(UserRole.CREATOR);
		grants[0].status = PaidGrantStatus.REVOKED;
		await expect(service.resolve(user)).resolves.toBe(UserRole.SIMPLE);
		expect(repository.find).toHaveBeenCalledTimes(2);
		expect(repository.find).toHaveBeenCalledWith({
			where: { userId: user.id, status: expect.objectContaining({ _value: [PaidGrantStatus.ACTIVE, PaidGrantStatus.CANCELLED] }) }
		});
		repository.find.mockRejectedValueOnce(new Error('database unavailable'));
		await expect(service.resolve(user)).rejects.toThrow('database unavailable');
	});

	it('samples time after the authoritative read, not before a delayed database result', async () => {
		repository.find.mockImplementationOnce(async () => {
			jest.setSystemTime(expiresAt);
			return grants;
		});
		await expect(service.resolve(user)).resolves.toBe(UserRole.SIMPLE);
	});
});
