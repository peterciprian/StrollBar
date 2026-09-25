import { ForbiddenException, Logger } from '@nestjs/common';
import { AuditAction, AuditEventEntity } from './audit.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
	let repository: any;
	let queryRunner: any;
	let service: AuditService;
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		queryRunner = {
			connect: jest.fn().mockResolvedValue(undefined),
			query: jest.fn().mockResolvedValue(undefined),
			release: jest.fn().mockResolvedValue(undefined),
			manager: {
				createQueryBuilder: jest.fn()
			}
		};
		const deleteBuilder: Record<string, jest.Mock> = {};
		deleteBuilder.delete = jest.fn(() => deleteBuilder);
		deleteBuilder.from = jest.fn(() => deleteBuilder);
		deleteBuilder.where = jest.fn(() => deleteBuilder);
		deleteBuilder.setParameters = jest.fn(() => deleteBuilder);
		deleteBuilder.execute = jest.fn().mockResolvedValue({ affected: 3 });
		queryRunner.manager.createQueryBuilder.mockReturnValue(deleteBuilder);
		repository = {
			insert: jest.fn().mockResolvedValue(undefined),
			find: jest.fn().mockResolvedValue([]),
			manager: {
				connection: {
					createQueryRunner: jest.fn(() => queryRunner)
				}
			}
		};
		loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		service = new AuditService(repository);
	});

	afterEach(() => {
		loggerSpy.mockRestore();
	});

	it('records audit events with normalized nullable fields and truncated IP address', async () => {
		await service.record({
			action: AuditAction.LOGIN,
			userId: 'user-1',
			success: false,
			ipAddress: 'x'.repeat(80),
			metadata: { email: 'walker@example.com' }
		});

		expect(repository.insert).toHaveBeenCalledWith({
			action: AuditAction.LOGIN,
			userId: 'user-1',
			actorUserId: null,
			success: false,
			ipAddress: 'x'.repeat(64),
			metadata: { email: 'walker@example.com' }
		});
	});

	it('never throws when audit persistence fails', async () => {
		repository.insert.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(service.record({ action: AuditAction.LOGOUT, success: true })).resolves.toBeUndefined();
		expect(loggerSpy).toHaveBeenCalledWith('Failed to persist audit event.', expect.any(String));
	});

	it('lists audit events with action filter and clamps limits', async () => {
		await service.list({ action: AuditAction.LOGIN, limit: 9999 });

		expect(repository.find).toHaveBeenCalledWith({
			where: { action: AuditAction.LOGIN },
			order: { createdAt: 'DESC' },
			take: 500
		});

		await service.list({ limit: 0 });

		expect(repository.find).toHaveBeenLastCalledWith({
			where: {},
			order: { createdAt: 'DESC' },
			take: 100
		});
	});

	it('throws a consistent admin-only forbidden exception', () => {
		expect(() => service.forbidden()).toThrow(ForbiddenException);
	});

	it('purges expired audit events through the retention bypass setting and always releases the query runner', async () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-09-25T12:00:00.000Z'));

		try {
			await service.purgeExpired(30);

			expect(queryRunner.connect).toHaveBeenCalledTimes(1);
			expect(queryRunner.query).toHaveBeenNthCalledWith(1, `SELECT set_config('strollbar.audit_retention', 'true', false)`);
			expect(queryRunner.manager.createQueryBuilder().where).toHaveBeenCalledWith('"createdAt" < :cutoff', {
				cutoff: new Date('2026-08-26T12:00:00.000Z')
			});
			expect(queryRunner.query).toHaveBeenLastCalledWith(`SELECT set_config('strollbar.audit_retention', 'false', false)`);
			expect(queryRunner.release).toHaveBeenCalledTimes(1);
		} finally {
			jest.useRealTimers();
		}
	});

	it('resets retention bypass and releases the query runner when purge fails', async () => {
		const deleteBuilder = queryRunner.manager.createQueryBuilder();
		deleteBuilder.execute.mockRejectedValueOnce(new Error('delete failed'));

		await expect(service.purgeExpired(365)).rejects.toThrow('delete failed');
		expect(queryRunner.query).toHaveBeenLastCalledWith(`SELECT set_config('strollbar.audit_retention', 'false', false)`);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
	});
});
