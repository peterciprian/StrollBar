import { AuditEventEntity } from '../../common/audit.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RoleAssignmentsService } from './role-assignments.service';
import { PaidGrantEntity, PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import { RoleLifecycleEventType, RoleLifecycleOutboxEntity } from './entities/role-lifecycle-outbox.entity';
import { UserEntity, UserRole } from './entities/user.entity';

describe('RoleAssignmentsService', () => {
	it('writes a durable expiry event in the same transaction as the grant and audit', async () => {
		const actor: AuthenticatedUser = {
			userId: '00000000-0000-4000-8000-000000000001',
			username: 'admin',
			email: 'admin@example.invalid',
			role: UserRole.ADMIN
		};
		const userId = '00000000-0000-4000-8000-000000000002';
		const expiresAt = '2027-01-01T00:00:00.000Z';
		const manager = {
			findOne: jest
				.fn()
				.mockResolvedValueOnce({ id: actor.userId, role: UserRole.ADMIN, isActive: true })
				.mockResolvedValueOnce({ id: userId, role: UserRole.SIMPLE, isActive: true }),
			create: jest.fn((_entity, values) => values),
			save: jest.fn(async (entity, values) => entity === PaidGrantEntity ? { ...values, id: 'grant-1' } : values)
		};
		const dataSource = {
			transaction: jest.fn(async (operation: (value: typeof manager) => unknown) => operation(manager))
		};
		const service = new RoleAssignmentsService(dataSource as never);

		await service.createGrant(userId, {
			plan: PaidPlan.CREATOR,
			startsAt: '2026-01-01T00:00:00.000Z',
			expiresAt,
			reason: 'Approved support grant'
		}, actor);

		expect(dataSource.transaction).toHaveBeenCalledTimes(1);
		expect(manager.save).toHaveBeenCalledWith(
			RoleLifecycleOutboxEntity,
			expect.objectContaining({
				eventType: RoleLifecycleEventType.PAID_GRANT_EXPIRY,
				userId,
				grantId: 'grant-1',
				availableAt: new Date(expiresAt)
			})
		);
		expect(manager.save).toHaveBeenCalledWith(
			AuditEventEntity,
			expect.objectContaining({ userId, actorUserId: actor.userId })
		);
	});

	it('keeps new grants active and does not send lifecycle mail in the request transaction', async () => {
		const actor = {
			userId: '00000000-0000-4000-8000-000000000001',
			username: 'admin',
			email: 'admin@example.invalid',
			role: UserRole.ADMIN
		} as AuthenticatedUser;
		const manager = {
			findOne: jest
				.fn()
				.mockResolvedValueOnce({ id: actor.userId, role: UserRole.ADMIN, isActive: true })
				.mockResolvedValueOnce({ id: 'target', role: UserRole.SIMPLE, isActive: true }),
			create: jest.fn((_entity, values) => values),
			save: jest.fn(async (entity, values) => entity === PaidGrantEntity ? { ...values, id: 'grant-2' } : values)
		};
		const service = new RoleAssignmentsService({
			transaction: jest.fn(async (operation: (value: typeof manager) => unknown) => operation(manager))
		} as never);

		const grant = await service.createGrant('target', {
			plan: PaidPlan.PREMIUM,
			startsAt: '2026-01-01T00:00:00.000Z',
			expiresAt: '2027-01-01T00:00:00.000Z',
			reason: 'Approved support grant'
		}, actor);

		expect(grant).toMatchObject({ id: 'grant-2', status: PaidGrantStatus.ACTIVE });
		expect(manager.save).toHaveBeenCalledTimes(3);
	});
});
