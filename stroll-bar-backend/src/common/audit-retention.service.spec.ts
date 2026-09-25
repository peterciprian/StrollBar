import { ConfigService } from '@nestjs/config';
import { AuditRetentionService } from './audit-retention.service';

describe('AuditRetentionService', () => {
	let auditService: { purgeExpired: jest.Mock };
	let configService: ConfigService;

	beforeEach(() => {
		jest.useFakeTimers();
		auditService = { purgeExpired: jest.fn().mockResolvedValue(undefined) };
		configService = {
			get: jest.fn((key: string) => {
				const values: Record<string, string> = {
					AUDIT_RETENTION_DAYS: '30',
					AUDIT_RETENTION_INTERVAL_MS: '60000'
				};
				return values[key];
			})
		} as unknown as ConfigService;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('purges once on startup and schedules recurring retention purges', () => {
		const service = new AuditRetentionService(auditService as never, configService);

		service.onModuleInit();

		expect(auditService.purgeExpired).toHaveBeenCalledWith(30);
		expect(auditService.purgeExpired).toHaveBeenCalledTimes(1);

		jest.advanceTimersByTime(60000);

		expect(auditService.purgeExpired).toHaveBeenCalledTimes(2);
		expect(auditService.purgeExpired).toHaveBeenLastCalledWith(30);

		service.onModuleDestroy();
	});

	it('clears the interval on module destroy', () => {
		const service = new AuditRetentionService(auditService as never, configService);

		service.onModuleInit();
		service.onModuleDestroy();
		jest.advanceTimersByTime(60000);

		expect(auditService.purgeExpired).toHaveBeenCalledTimes(1);
	});
});
