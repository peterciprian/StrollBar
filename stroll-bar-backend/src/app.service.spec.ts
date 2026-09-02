import { ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';

describe('AppService health checks', () => {
	let service: AppService;
	let dataSource: { query: jest.Mock; options: { type: string } };
	let mediaService: { checkStorageConnectivity: jest.Mock };
	let emailService: { checkDeliveryConnectivity: jest.Mock };

	beforeEach(() => {
		dataSource = {
			query: jest.fn(),
			options: { type: 'postgres' }
		};
		mediaService = {
			checkStorageConnectivity: jest.fn()
		};
		emailService = {
			checkDeliveryConnectivity: jest.fn().mockResolvedValue({
				status: 'up',
				provider: 'smtp',
				detail: 'Email delivery is disabled.'
			})
		};

		service = new AppService(dataSource as any, mediaService as any, emailService as any);
	});

	it('returns ok when database and storage are both healthy', async () => {
		dataSource.query.mockResolvedValue({ rows: [{ dbname: 'defaultdb', username: 'avnadmin' }] });
		mediaService.checkStorageConnectivity.mockResolvedValue({
			status: 'up',
			provider: 's3-compatible',
			detail: 'Bucket reachable.'
		});

		await expect(service.health()).resolves.toMatchObject({
			status: 'ok',
			database: expect.objectContaining({ status: 'up' }),
			storage: expect.objectContaining({ status: 'up' })
		});
	});

	it('reports storage health separately', async () => {
		mediaService.checkStorageConnectivity.mockResolvedValue({
			status: 'up',
			provider: 's3-compatible',
			detail: 'Bucket reachable.'
		});

		await expect(service.storageHealth()).resolves.toMatchObject({
			status: 'up',
			provider: 's3-compatible'
		});
	});

	it('throws when either dependency is unavailable', async () => {
		dataSource.query.mockResolvedValue({ rows: [{ dbname: 'defaultdb', username: 'avnadmin' }] });
		mediaService.checkStorageConnectivity.mockResolvedValue({
			status: 'down',
			provider: 's3-compatible',
			detail: 'Bucket unreachable.'
		});

		await expect(service.health()).rejects.toThrow(ServiceUnavailableException);
	});
});
