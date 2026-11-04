import { INestApplication, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../../app.controller';
import { AppService } from '../../app.service';
import { StructuredExceptionFilter } from '../filters/structured-exception.filter';

describe('AppModule request logging registration', () => {
	let app: INestApplication;
	let completionSpy: jest.SpyInstance;
	let warningSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	beforeAll(async () => {
		// Import the real registration without reading environment files or configuring external services.
		const configSpy = jest.spyOn(ConfigModule, 'forRoot').mockResolvedValue({ module: ConfigModule });
		let AppModule;
		try {
			({ AppModule } = await import('../../app.module'));
		} finally {
			configSpy.mockRestore();
		}
		@Module({
			imports: [],
			controllers: [AppController],
			providers: [{
				provide: AppService,
				useValue: {
					health: () => ({ status: 'ok' }),
					databaseHealth: () => ({ status: 'ok' }),
					storageHealth: () => ({ status: 'ok' })
				}
			}]
		})
		class IsolatedAppModule extends AppModule {}

		completionSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
		warningSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
		errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		const moduleRef = await Test.createTestingModule({ imports: [IsolatedAppModule] }).compile();
		app = moduleRef.createNestApplication();
		app.setGlobalPrefix('v1');
		app.useGlobalFilters(new StructuredExceptionFilter());
		await app.init();
	});

	afterAll(async () => {
		await app?.close();
		jest.restoreAllMocks();
	});

	beforeEach(() => {
		completionSpy.mockClear();
		errorSpy.mockClear();
	});

	it('initializes without legacy wildcard conversion warnings', () => {
		expect(warningSpy.mock.calls.filter(([message]) => /Unsupported route path|LegacyRouteConverter/.test(String(message)))).toEqual([]);
	});

	it.each([
		['/v1', 404],
		['/v1/', 404],
		['/v1/health', 200],
		['/v1/health/db', 200],
		['/v1/health/storage', 200],
		['/v1/missing/deeper', 404]
	])('logs completion and reuses request IDs for %s', async (path, statusCode) => {
		const response = await request(app.getHttpServer()).get(path).set('x-request-id', 'routing-request').expect(statusCode);

		expect(response.headers['x-request-id']).toBe('routing-request');
		expect(completionSpy).toHaveBeenCalledTimes(1);
		expect(JSON.parse(completionSpy.mock.calls[0][0])).toMatchObject({
			event: 'http_request', requestId: 'routing-request', method: 'GET', path, statusCode, durationMs: expect.any(Number)
		});
		if (statusCode === 404) {
			expect(response.body).toEqual({ statusCode: 404, error: 'Request Error', message: `Cannot GET ${path}` });
			const record = JSON.parse(warningSpy.mock.calls[warningSpy.mock.calls.length - 1][0]);
			expect(record).toMatchObject({ event: 'http_error', requestId: 'routing-request', statusCode: 404 });
			expect(record).not.toHaveProperty('stack');
		}
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('generates a request ID when none is supplied', async () => {
		const response = await request(app.getHttpServer()).get('/v1/health/db').expect(200);
		expect(response.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
		expect(JSON.parse(completionSpy.mock.calls[0][0])).toMatchObject({ requestId: response.headers['x-request-id'] });
	});

	it.each(['get', 'head'] as const)('leaves root %s as a stack-free 404', async (method) => {
		const response = await request(app.getHttpServer())[method]('/').expect(404);
		if (method === 'head') {
			expect(response.text).toBeUndefined();
		} else {
			expect(response.body).toEqual({ statusCode: 404, error: 'Request Error', message: 'Cannot GET /' });
		}
		const record = JSON.parse(warningSpy.mock.calls[warningSpy.mock.calls.length - 1][0]);
		expect(record).toMatchObject({ event: 'http_error', method: method.toUpperCase(), path: '/', statusCode: 404 });
		expect(record).not.toHaveProperty('stack');
		expect(errorSpy).not.toHaveBeenCalled();
	});
});
