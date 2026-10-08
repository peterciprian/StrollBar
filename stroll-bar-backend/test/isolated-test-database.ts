import { DataSource } from 'typeorm';

// Never read .env.production or fall back to a running application's database.
export async function configureIsolatedTestDatabase(): Promise<void> {
	const required = ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_USERNAME', 'TEST_DB_PASSWORD', 'TEST_DB_NAME'];
	const missing = required.filter((key) => !process.env[key]);
	if (missing.length) throw new Error(`Explicit isolated test database required: ${missing.join(', ')}`);
	const host = process.env.TEST_DB_HOST!;
	const database = process.env.TEST_DB_NAME!;
	if (!['127.0.0.1', 'localhost', '::1'].includes(host) || !/^strollbar_test_[a-z0-9_]+$/.test(database)) {
		throw new Error('E2E database must be local and named strollbar_test_<unique suffix>. Refusing unsafe database.');
	}
	const dataSource = new DataSource({
		type: 'postgres',
		host,
		port: Number(process.env.TEST_DB_PORT),
		username: process.env.TEST_DB_USERNAME,
		password: process.env.TEST_DB_PASSWORD,
		database,
		ssl: false,
		extra: { connectionTimeoutMillis: 5000 }
	});
	try {
		await dataSource.initialize();
		await dataSource.query('SELECT 1');
	} finally {
		if (dataSource.isInitialized) await dataSource.destroy();
	}
	process.env.NODE_ENV = 'test';
	process.env.DB_HOST = host;
	process.env.DB_PORT = process.env.TEST_DB_PORT;
	process.env.DB_USERNAME = process.env.TEST_DB_USERNAME;
	process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD;
	process.env.DB_NAME = database;
	process.env.DB_SSL = 'false';
	process.env.DB_MIGRATIONS_RUN = 'true';
}
