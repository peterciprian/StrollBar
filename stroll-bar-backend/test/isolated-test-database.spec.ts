import { configureIsolatedTestDatabase } from './isolated-test-database';
import { Client } from 'pg';

jest.mock('pg', () => ({ Client: jest.fn() }));

describe('E2E database safety', () => {
	const original = { ...process.env };
	beforeEach(() => {
		for (const key of ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_USERNAME', 'TEST_DB_PASSWORD', 'TEST_DB_NAME']) delete process.env[key];
		jest.clearAllMocks();
	});
	afterEach(() => { process.env = { ...original }; });

	it('refuses to fall back to application DB credentials', async () => {
		process.env.DB_HOST = 'production.example.com';
		process.env.DB_NAME = 'live';
		await expect(configureIsolatedTestDatabase()).rejects.toThrow('Explicit isolated test database required');
		expect(Client).not.toHaveBeenCalled();
	});

	it.each([
		['production.example.com', 'strollbar_test_reset'],
		['127.0.0.1', 'strollbar'],
		['127.0.0.1', 'strollbar_test_reset"; DROP DATABASE live;']
	])('refuses unsafe host/database %s %s before connecting', async (host, database) => {
		Object.assign(process.env, {
			TEST_DB_HOST: host, TEST_DB_PORT: '55439', TEST_DB_USERNAME: 'test', TEST_DB_PASSWORD: 'test', TEST_DB_NAME: database
		});
		await expect(configureIsolatedTestDatabase()).rejects.toThrow('Refusing unsafe database');
		expect(Client).not.toHaveBeenCalled();
	});
});
