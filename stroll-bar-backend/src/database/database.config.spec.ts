import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, ConnectionOptions, createServer } from 'node:tls';
import { buildDatabaseOptions, buildDataSourceOptions } from './database.config';

// Synthetic test-only CA/key, never an application or provider credential.
const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures/tls.json'), 'utf8')) as Record<string, string>;

async function handshake(cert: string, ssl: ConnectionOptions): Promise<boolean> {
	const sockets = new Set<Socket>();
	const server = createServer({ key: fixtures.key, cert });
	server.on('connection', (socket) => {
		sockets.add(socket);
		socket.on('close', () => sockets.delete(socket));
	});
	server.on('tlsClientError', () => undefined);
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	try {
		const address = server.address();
		if (!address || typeof address === 'string') {
			throw new Error('Expected a TCP test listener.');
		}
		return await new Promise<boolean>((resolve, reject) => {
			const client = connect({ ...ssl, host: '127.0.0.1', port: address.port });
			client.setTimeout(3000, () => client.destroy(new Error('TLS test handshake timed out.')));
			client.once('error', reject);
			client.once('secureConnect', () => {
				resolve(client.authorized);
				client.destroy();
			});
		});
	} finally {
		for (const socket of sockets) {
			socket.destroy();
		}
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
}

describe('buildDatabaseOptions', () => {
	const originalEnv = process.env;
	let directory: string;
	let caFile: string;

	beforeEach(() => {
		process.env = { ...originalEnv, NODE_ENV: 'test' };
		delete process.env.DB_SSL;
		delete process.env.DB_SSL_CA_FILE;
		delete process.env.DB_HOST;
		directory = mkdtempSync(join(tmpdir(), 'strollbar-sec06-'));
		caFile = join(directory, 'ca.pem');
		writeFileSync(caFile, fixtures.ca);
	});

	afterEach(() => {
		process.env = originalEnv;
		rmSync(directory, { recursive: true, force: true });
	});

	function productionSsl(): ConnectionOptions {
		process.env.NODE_ENV = 'production';
		process.env.DB_SSL = 'verify-full';
		process.env.DB_HOST = 'localhost';
		process.env.DB_SSL_CA_FILE = caFile;
		return (buildDatabaseOptions() as { ssl: ConnectionOptions }).ssl;
	}

	it('keeps local PostgreSQL usable without TLS', () => {
		expect((buildDatabaseOptions() as { ssl: unknown }).ssl).toBe(false);
		process.env.DB_SSL = 'false';
		expect((buildDataSourceOptions() as { ssl: unknown }).ssl).toBe(false);
	});

	it.each([undefined, 'false', ''])('rejects disabled/missing production TLS: %s', (value) => {
		process.env.NODE_ENV = 'production';
		if (value !== undefined) process.env.DB_SSL = value;
		expect(buildDatabaseOptions).toThrow(/DB_SSL/);
		expect(buildDataSourceOptions).toThrow(/DB_SSL/);
	});

	it.each(['verify-full', 'true', 'require', 'VERIFY-FULL'])('always verifies in TLS mode %s', (mode) => {
		process.env.NODE_ENV = 'production';
		process.env.DB_SSL = mode;
		expect((buildDatabaseOptions() as { ssl: ConnectionOptions }).ssl).toMatchObject({ rejectUnauthorized: true });
		expect((buildDataSourceOptions() as { ssl: ConnectionOptions }).ssl).toMatchObject({ rejectUnauthorized: true });
	});

	it.each(['', 'verify-ca', 'prefer', 'disable', '0', 'false ', ' verify-full', 'garbage'])('rejects unknown/malformed TLS mode %j', (mode) => {
		process.env.DB_SSL = mode;
		expect(buildDatabaseOptions).toThrow(/Invalid DB_SSL/);
	});

	it('uses Node trust roots when no provider CA is configured', () => {
		productionSsl();
		delete process.env.DB_SSL_CA_FILE;
		expect((buildDatabaseOptions() as { ssl: ConnectionOptions }).ssl.ca).toBeUndefined();
	});

	it('rejects a CA setting when TLS is disabled', () => {
		process.env.DB_SSL_CA_FILE = caFile;
		expect(buildDatabaseOptions).toThrow(/requires TLS/);
	});

	it.each(['', ' ', 'missing.pem'])('rejects empty or unreadable CA path %j', (path) => {
		productionSsl();
		process.env.DB_SSL_CA_FILE = path;
		expect(buildDatabaseOptions).toThrow(/DB_SSL_CA_FILE/);
	});

	it.each(['', 'not a certificate', '-----BEGIN CERTIFICATE-----\nbroken\n-----END CERTIFICATE-----', fixtures.ca + 'garbage', fixtures.ca + fixtures.expired])(
		'rejects malformed or non-CA certificate bundles (%#)',
		(contents) => {
			productionSsl();
			writeFileSync(caFile, contents);
			expect(buildDatabaseOptions).toThrow(/DB_SSL_CA_FILE/);
		}
	);

	it.each(['', ' localhost', 'https://localhost', 'local host'])('rejects malformed TLS hostname %j', (host) => {
		productionSsl();
		process.env.DB_HOST = host;
		expect(buildDatabaseOptions).toThrow(/DB_HOST/);
	});

	it('accepts a trusted certificate for the configured DB_HOST', async () => {
		const ssl = productionSsl();
		expect(ssl.ca).toBe(fixtures.ca);
		await expect(handshake(fixtures.trusted, ssl)).resolves.toBe(true);
	});

	it('rejects a self-signed server certificate', async () => {
		await expect(handshake(fixtures.selfSigned, productionSsl())).rejects.toMatchObject({ code: 'DEPTH_ZERO_SELF_SIGNED_CERT' });
	});

	it('rejects an untrusted issuing CA', async () => {
		productionSsl();
		delete process.env.DB_SSL_CA_FILE;
		const ssl = (buildDatabaseOptions() as { ssl: ConnectionOptions }).ssl;
		await expect(handshake(fixtures.trusted, ssl)).rejects.toMatchObject({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' });
	});

	it('rejects an expired server certificate signed by the trusted CA', async () => {
		await expect(handshake(fixtures.expired, productionSsl())).rejects.toMatchObject({ code: 'CERT_HAS_EXPIRED' });
	});

	it('rejects a trusted certificate for the wrong hostname', async () => {
		productionSsl();
		process.env.DB_HOST = 'wrong-host.example';
		const ssl = (buildDatabaseOptions() as { ssl: ConnectionOptions }).ssl;
		await expect(handshake(fixtures.trusted, ssl)).rejects.toMatchObject({ code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
	});

	it('verifies IP identities rather than accepting a DNS-only certificate', async () => {
		productionSsl();
		process.env.DB_HOST = '127.0.0.1';
		const ssl = (buildDatabaseOptions() as { ssl: ConnectionOptions }).ssl;
		await expect(handshake(fixtures.trusted, ssl)).rejects.toMatchObject({ code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
	});

	it('deploys explicit production verification and the provider CA file', () => {
		const blueprint = readFileSync(join(__dirname, '../../../render.yaml'), 'utf8');
		const setting = (key: string) => blueprint.match(new RegExp(`- key: ${key}\\r?\\n\\s+value: (.+)`))?.[1].trim();
		expect(setting('NODE_ENV')).toBe('production');
		expect(setting('DB_SSL')).toBe('verify-full');
		expect(setting('DB_SSL_CA_FILE')).toBe('/etc/secrets/aiven-ca.pem');
		productionSsl();
		process.env.NODE_ENV = setting('NODE_ENV');
		process.env.DB_SSL = setting('DB_SSL');
		expect((buildDataSourceOptions() as { ssl: ConnectionOptions }).ssl.rejectUnauthorized).toBe(true);
	});

	it('registers every migration in chronological order', () => {
		const options = buildDatabaseOptions();
		const migrations = Array.isArray(options.migrations) ? options.migrations : [];
		const migrationNames = migrations.map((migration) => (typeof migration === 'function' ? migration.name : String(migration)));

		expect(migrationNames).toEqual([
			'InitialSchema1752864000000',
			'AuthTokensAndPasswordReset1752885000000',
			'MediaAssets1752896000000',
			'SocialAuthIdentities1752907000000',
			'EmailVerification1752918000000',
			'UserRoles1752929000000',
			'QueryPerformanceIndexes1753000000000',
			'AuditEvents1753100000000',
			'StrollCategoryPriceLength1753200000000',
			'AdventureResults1753300000000',
			'StrollReviews1753400000000',
			'UserBadges1753600000000',
			'BadgeDefinitions1753700000000',
			'StrollReports1753800000000',
			'RiddleBadges1753900000000',
			'UserPreferredLanguage1754000000000',
			'UserAuthVersion1754100000000',
			'SocialTransactions1754200000000'
		]);
	});
});
