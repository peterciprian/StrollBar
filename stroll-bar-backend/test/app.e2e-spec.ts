import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { jest, describe, expect, beforeAll, afterAll, it } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

jest.setTimeout(120000);

type TestDatabaseConfig = {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	ssl: boolean | { rejectUnauthorized: boolean };
};

function parseEnvFile(filePath: string): Record<string, string> {
	if (!existsSync(filePath)) {
		return {};
	}

	return readFileSync(filePath, 'utf8')
		.split(/\r?\n/)
		.filter((line) => line.trim() && !line.startsWith('#'))
		.reduce<Record<string, string>>((acc, line) => {
			const separatorIndex = line.indexOf('=');
			if (separatorIndex > -1) {
				const key = line.slice(0, separatorIndex).trim();
				const value = line.slice(separatorIndex + 1).trim();
				acc[key] = value;
			}
			return acc;
		}, {});
}

function resolveSslOption(value: string | undefined): boolean | { rejectUnauthorized: boolean } {
	if (!value || value === 'false') {
		return false;
	}

	if (value === 'true' || value === 'require') {
		return { rejectUnauthorized: false };
	}

	return false;
}

async function canConnect(config: TestDatabaseConfig): Promise<boolean> {
	const client = new Client({
		host: config.host,
		port: config.port,
		user: config.username,
		password: config.password,
		database: config.database,
		ssl: config.ssl,
		connectionTimeoutMillis: 5000
	});

	try {
		await client.connect();
		return true;
	} catch {
		return false;
	} finally {
		await client.end().catch(() => undefined);
	}
}

async function ensureTestDatabase(config: TestDatabaseConfig, testDatabaseName: string): Promise<TestDatabaseConfig> {
	const adminDatabase = config.host === '127.0.0.1' ? 'postgres' : 'defaultdb';
	const adminClient = new Client({
		host: config.host,
		port: config.port,
		user: config.username,
		password: config.password,
		database: adminDatabase,
		ssl: config.ssl,
		connectionTimeoutMillis: 5000
	});

	try {
		await adminClient.connect();
		const existing = await adminClient.query<{ datname: string }>(`SELECT 1 FROM pg_database WHERE datname = $1`, [testDatabaseName]);

		if (existing.rowCount && existing.rowCount > 0) {
			return { ...config, database: testDatabaseName };
		}

		await adminClient.query(`CREATE DATABASE "${testDatabaseName}"`);
		return { ...config, database: testDatabaseName };
	} catch (error) {
		if (error instanceof Error && /already exists/i.test(error.message)) {
			return { ...config, database: testDatabaseName };
		}

		throw error;
	} finally {
		await adminClient.end().catch(() => undefined);
	}
}

describe('StrollBar API (e2e)', () => {
	let app: INestApplication;
	let accessToken = '';
	let refreshToken = '';
	let strollId = '';
	let stageId = '';
	let adventureId = '';
	let userId = '';
	const testRunId = Date.now().toString(36);
	const testUsername = `walker-${testRunId}`;
	const testEmail = `walker-${testRunId}@example.com`;

	beforeAll(async () => {
		const envFilePath = join(process.cwd(), '.env.production');
		const productionEnv = parseEnvFile(envFilePath);

		process.env.JWT_SECRET = 'test-secret';
		process.env.DB_HOST = process.env.DB_HOST ?? productionEnv.DB_HOST ?? '127.0.0.1';
		process.env.DB_PORT = process.env.DB_PORT ?? productionEnv.DB_PORT ?? '5432';
		process.env.DB_USERNAME = process.env.DB_USERNAME ?? productionEnv.DB_USERNAME ?? 'postgres';
		process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? productionEnv.DB_PASSWORD ?? 'postgres';
		process.env.DB_NAME = process.env.DB_NAME ?? 'strollbar_test';
		process.env.DB_SSL = process.env.DB_SSL ?? productionEnv.DB_SSL ?? 'false';
		process.env.DB_MIGRATIONS_RUN = 'true';
		process.env.S3_REGION = 'auto';
		process.env.S3_ENDPOINT = 'http://127.0.0.1:9000';
		process.env.S3_BUCKET_NAME = 'strollbar-media-test';
		process.env.S3_ACCESS_KEY_ID = 'test-access-key';
		process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
		process.env.S3_PUBLIC_BASE_URL = 'https://cdn.test.example.com/strollbar-media';
		process.env.S3_FORCE_PATH_STYLE = 'true';
		process.env.EMAIL_DELIVERY_ENABLED = 'false';
		// Set explicitly so this suite doesn't depend on NODE_ENV/.env.test being picked up correctly by ConfigModule.
		process.env.AUTH_EXPOSE_RESET_TOKEN = 'true';

		const dbConfig: TestDatabaseConfig = {
			host: process.env.DB_HOST,
			port: Number(process.env.DB_PORT ?? '5432'),
			username: process.env.DB_USERNAME ?? 'postgres',
			password: process.env.DB_PASSWORD ?? 'postgres',
			database: process.env.DB_NAME ?? 'strollbar_test',
			ssl: resolveSslOption(process.env.DB_SSL)
		};

		const requestedDatabase = process.env.DB_NAME ?? 'strollbar_test';
		let resolvedDbConfig: TestDatabaseConfig = {
			...dbConfig,
			database: requestedDatabase
		};

		if (!(await canConnect(resolvedDbConfig))) {
			try {
				resolvedDbConfig = await ensureTestDatabase(
					{
						...dbConfig,
						host: process.env.DB_HOST ?? productionEnv.DB_HOST ?? '127.0.0.1',
						port: Number(process.env.DB_PORT ?? productionEnv.DB_PORT ?? '5432'),
						username: process.env.DB_USERNAME ?? productionEnv.DB_USERNAME ?? 'postgres',
						password: process.env.DB_PASSWORD ?? productionEnv.DB_PASSWORD ?? 'postgres',
						database: requestedDatabase,
						ssl: resolveSslOption(process.env.DB_SSL ?? productionEnv.DB_SSL)
					},
					requestedDatabase
				);
			} catch {
				resolvedDbConfig = {
					...dbConfig,
					host: process.env.DB_HOST ?? productionEnv.DB_HOST ?? '127.0.0.1',
					port: Number(process.env.DB_PORT ?? productionEnv.DB_PORT ?? '5432'),
					username: process.env.DB_USERNAME ?? productionEnv.DB_USERNAME ?? 'postgres',
					password: process.env.DB_PASSWORD ?? productionEnv.DB_PASSWORD ?? 'postgres',
					database: productionEnv.DB_NAME ?? 'defaultdb',
					ssl: resolveSslOption(process.env.DB_SSL ?? productionEnv.DB_SSL)
				};
			}
		}

		process.env.DB_HOST = resolvedDbConfig.host;
		process.env.DB_PORT = String(resolvedDbConfig.port);
		process.env.DB_USERNAME = resolvedDbConfig.username;
		process.env.DB_PASSWORD = resolvedDbConfig.password;
		process.env.DB_NAME = resolvedDbConfig.database;

		const { AppModule } = await import('../src/app.module');

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile();

		app = moduleRef.createNestApplication();
		app.setGlobalPrefix('v1');
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
				forbidNonWhitelisted: true
			})
		);

		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	it('registers and logs in a user', async () => {
		const registerResponse = await request(app.getHttpServer())
			.post('/v1/auth/register')
			.send({
				username: testUsername,
				email: testEmail,
				password: 'StrollWalk!2026'
			})
			.expect(201);

		expect(registerResponse.body.accessToken).toBeDefined();
		expect(registerResponse.body.refreshToken).toBeDefined();
		expect(registerResponse.body.user.email).toBe(testEmail);
		expect(registerResponse.body.user.passwordHash).toBeUndefined();
		expect(registerResponse.body.user.refreshTokenHash).toBeUndefined();
		userId = registerResponse.body.user.id;

		const loginResponse = await request(app.getHttpServer())
			.post('/v1/auth/login')
			.send({
				email: testEmail,
				password: 'StrollWalk!2026'
			})
			.expect(201);

		expect(loginResponse.body.accessToken).toBeDefined();
		expect(loginResponse.body.refreshToken).toBeDefined();
		expect(loginResponse.body.user.id).toBe(userId);
		accessToken = loginResponse.body.accessToken;
		refreshToken = loginResponse.body.refreshToken;
	});

	it('reports degraded health when object storage is unreachable', async () => {
		const response = await request(app.getHttpServer()).get('/v1/health').expect(503);

		expect(response.body.status).toBe('degraded');
		expect(response.body.database.status).toBe('up');
		expect(response.body.storage.status).toBe('down');
	});

	it('refreshes the JWT token pair', async () => {
		const response = await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken }).expect(201);

		expect(response.body.accessToken).toBeDefined();
		expect(response.body.refreshToken).toBeDefined();
		expect(response.body.user.id).toBe(userId);

		accessToken = response.body.accessToken;
		refreshToken = response.body.refreshToken;
	});

	it('logs out and revokes the refresh token', async () => {
		await request(app.getHttpServer()).post('/v1/auth/logout').set('Authorization', `Bearer ${accessToken}`).send({ refreshToken }).expect(201);

		await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken }).expect(401);

		const loginResponse = await request(app.getHttpServer())
			.post('/v1/auth/login')
			.send({
				email: testEmail,
				password: 'StrollWalk!2026'
			})
			.expect(201);

		accessToken = loginResponse.body.accessToken;
		refreshToken = loginResponse.body.refreshToken;
	});

	it('returns the authenticated user from /auth/me', async () => {
		const response = await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200);

		expect(response.body.id).toBe(userId);
		expect(response.body.passwordHash).toBeUndefined();
	});

	it('creates a stroll, adds a stage, unlocks an adventure, and submits an answer', async () => {
		const createStrollResponse = await request(app.getHttpServer())
			.post('/v1/strolls')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				name: 'Budapest Highlights',
				description: 'A short guided route through the city center.',
				labels: ['city', 'architecture']
			})
			.expect(201);

		expect(createStrollResponse.body.authorId).toBe(userId);
		strollId = createStrollResponse.body.id;

		const ownedStrollsResponse = await request(app.getHttpServer())
			.get('/v1/strolls/mine')
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);

		expect(ownedStrollsResponse.body.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: strollId,
					authorId: userId,
					activeStatus: 'draft',
					publicityFlag: 'public'
				})
			])
		);

		const createStageResponse = await request(app.getHttpServer())
			.post(`/v1/strolls/${strollId}/stages`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				orderIndex: 1,
				name: 'Parliament',
				description: 'Solve the riddle to continue.',
				address: 'Kossuth Lajos ter 1-3',
				riddleAnswer: 'neo-gothic'
			})
			.expect(201);

		expect(createStageResponse.body.strollId).toBe(strollId);
		stageId = createStageResponse.body.id;

		for (const activeStatus of ['draft', 'published', 'archived']) {
			await request(app.getHttpServer())
				.patch(`/v1/strolls/${strollId}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send({ activeStatus })
				.expect(200);

			const ownedDetailResponse = await request(app.getHttpServer())
				.get(`/v1/strolls/mine/${strollId}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			expect(ownedDetailResponse.body.stroll).toEqual(expect.objectContaining({ id: strollId, authorId: userId, activeStatus }));
			expect(ownedDetailResponse.body.stages).toEqual(expect.arrayContaining([expect.objectContaining({ id: stageId })]));
		}

		await request(app.getHttpServer())
			.patch(`/v1/strolls/${strollId}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ activeStatus: 'published' })
			.expect(200);

		const unlockResponse = await request(app.getHttpServer())
			.post('/v1/adventures/unlock')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ strollId })
			.expect(201);

		expect(unlockResponse.body.ownerUserId).toBe(userId);
		adventureId = unlockResponse.body.id;

		const repeatedUnlockResponse = await request(app.getHttpServer())
			.post('/v1/adventures/unlock')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ strollId })
			.expect(201);

		expect(repeatedUnlockResponse.body.id).toBe(adventureId);

		const answerResponse = await request(app.getHttpServer())
			.post(`/v1/adventures/${adventureId}/stages/${stageId}/answer`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ answer: 'neo-gothic' })
			.expect(201);

		expect(answerResponse.body.isCorrect).toBe(true);
		expect(answerResponse.body.adventure.progressStatus).toBe('completed');
	});

	it('requests a password reset, confirms it, and allows login with the new password', async () => {
		const requestResetResponse = await request(app.getHttpServer())
			.post('/v1/auth/password-reset/request')
			.send({ email: testEmail })
			.expect(201);

		expect(requestResetResponse.body.message).toContain('password reset token');
		expect(requestResetResponse.body.resetToken).toBeDefined();

		await request(app.getHttpServer())
			.post('/v1/auth/password-reset/confirm')
			.send({
				resetToken: requestResetResponse.body.resetToken,
				newPassword: 'EvenBetterPass123!'
			})
			.expect(201);

		await request(app.getHttpServer())
			.post('/v1/auth/login')
			.send({
				email: testEmail,
				password: 'StrollWalk!2026'
			})
			.expect(401);

		const loginResponse = await request(app.getHttpServer())
			.post('/v1/auth/login')
			.send({
				email: testEmail,
				password: 'EvenBetterPass123!'
			})
			.expect(201);

		expect(loginResponse.body.accessToken).toBeDefined();
		expect(loginResponse.body.refreshToken).toBeDefined();
		accessToken = loginResponse.body.accessToken;
		refreshToken = loginResponse.body.refreshToken;
	});

	it('rate limits repeated login attempts', async () => {
		// Use a freshly registered account so this test never depends on the password-reset
		// flow (or any other prior test) having left the primary account in the expected state.
		const rateLimitEmail = `rate-limit-${testRunId}@example.com`;
		const rateLimitPassword = 'RateLimitPass123!';

		await request(app.getHttpServer())
			.post('/v1/auth/register')
			.send({
				username: `ratelimit-${testRunId}`,
				email: rateLimitEmail,
				password: rateLimitPassword
			})
			.expect(201);

		let rateLimited = false;

		for (let attempt = 0; attempt < 6; attempt += 1) {
			const response = await request(app.getHttpServer()).post('/v1/auth/login').send({
				email: rateLimitEmail,
				password: rateLimitPassword
			});

			if (response.status === 429) {
				rateLimited = true;
				break;
			}

			expect(response.status).toBe(201);
		}

		expect(rateLimited).toBe(true);
	});

	it('creates a presigned media upload URL', async () => {
		const mediaResponse = await request(app.getHttpServer())
			.post('/v1/media/presign-upload')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				fileName: 'cover.jpg',
				contentType: 'image/jpeg',
				sizeBytes: 5242880,
				purpose: 'stroll',
				entityId: strollId
			})
			.expect(201);

		expect(mediaResponse.body.objectKey).toContain('stroll/');
		expect(mediaResponse.body.assetId).toBeDefined();
		expect(mediaResponse.body.uploadUrl).toContain('127.0.0.1:9000');
		expect(mediaResponse.body.publicUrl).toContain('https://cdn.test.example.com/strollbar-media/');
		expect(mediaResponse.body.method).toBe('PUT');
	});

	it('rejects multipart upload initiation for files below the multipart threshold', async () => {
		await request(app.getHttpServer())
			.post('/v1/media/multipart/initiate')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				fileName: 'walkthrough.mp4',
				contentType: 'video/mp4',
				sizeBytes: 1024,
				purpose: 'stage',
				entityId: stageId
			})
			.expect(400);
	});
});
