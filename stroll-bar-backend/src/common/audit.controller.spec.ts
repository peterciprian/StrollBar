import { AuditController } from './audit.controller';
import { AuditAction } from './audit.entity';
import { UserRole } from '../modules/users/entities/user.entity';

describe('AuditController', () => {
	let auditService: { forbidden: jest.Mock; list: jest.Mock };
	let controller: AuditController;

	beforeEach(() => {
		auditService = {
			forbidden: jest.fn(() => {
				throw new Error('forbidden');
			}),
			list: jest.fn().mockResolvedValue([])
		};
		controller = new AuditController(auditService as never);
	});

	it('delegates non-admin users to the service forbidden path', () => {
		expect(() =>
			controller.list({ userId: 'user-1', email: 'u@example.com', username: 'u', role: UserRole.SIMPLE }, AuditAction.LOGIN, '25')
		).toThrow('forbidden');
		expect(auditService.list).not.toHaveBeenCalled();
	});

	it('passes admin filters and numeric limit to the audit service', async () => {
		const admin = { userId: 'admin-1', email: 'admin@example.com', username: 'admin', role: UserRole.ADMIN };

		await controller.list(admin, AuditAction.PASSWORD_RESET, '50');

		expect(auditService.list).toHaveBeenCalledWith({ action: AuditAction.PASSWORD_RESET, limit: 50 });
	});

	it('defaults the query limit to 100 for admins', async () => {
		const admin = { userId: 'admin-1', email: 'admin@example.com', username: 'admin', role: UserRole.ADMIN };

		await controller.list(admin);

		expect(auditService.list).toHaveBeenCalledWith({ action: undefined, limit: 100 });
	});
});
