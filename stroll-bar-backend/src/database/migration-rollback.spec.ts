import { DataSource } from 'typeorm';
import { Client } from 'pg';
import { buildDataSourceOptions } from './database.config';

describe('migration rollback smoke test', () => {
	let dataSource: DataSource;
	let databaseName: string;
	let adminClient: Client;
	let adminConnected = false;

	beforeAll(async () => {
		const baseOptions = buildDataSourceOptions() as any;
		databaseName = `strollbar_migration_${Date.now()}`;
		adminClient = new Client({
			host: baseOptions.host,
			port: baseOptions.port,
			user: baseOptions.username,
			password: baseOptions.password,
			database: 'postgres',
			ssl: baseOptions.ssl as any
		});
		await adminClient.connect();
		adminConnected = true;
		await adminClient.query(`CREATE DATABASE "${databaseName}"`);
		dataSource = new DataSource({
			...baseOptions,
			migrationsRun: false,
			database: databaseName
		} as any);
		await dataSource.initialize();
	});

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (adminClient && adminConnected) {
			await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
			await adminClient.end();
		}
	});

	it('applies and rolls back every migration in a disposable database', async () => {
		await dataSource.dropDatabase();
		await dataSource.runMigrations();
		const applied = await dataSource.showMigrations();
		expect(applied).toBe(false);

		const migrations = dataSource.migrations;
		for (let index = 0; index < migrations.length; index += 1) {
			await dataSource.undoLastMigration();
		}

		expect(await dataSource.showMigrations()).toBe(true);
	});
});
