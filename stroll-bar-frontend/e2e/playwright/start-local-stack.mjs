import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryDirectory = resolve(frontendDirectory, '..');
const backendDirectory = resolve(repositoryDirectory, 'stroll-bar-backend');
const containerName = `strollbar-password-reset-e2e-${process.pid}-${randomBytes(3).toString('hex')}`;
const databaseName = `strollbar_test_password_reset_${process.pid}`;
const children = [];
let databaseStarted = false;

function runDocker(args) {
	const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true });
	if (result.status !== 0) {
		throw new Error(`Docker command failed: docker ${args.join(' ')}\n${result.stderr || result.stdout}`);
	}
	return result.stdout.trim();
}

function start(command, args, options) {
	const child = spawn(command, args, { stdio: 'inherit', windowsHide: true, ...options });
	children.push(child);
	return child;
}

async function waitUntil(description, check, timeoutMs = 120_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (children.some((child) => child.exitCode !== null)) {
			throw new Error(`A service exited before becoming ready: ${description}.`);
		}
		try {
			if (await check()) return;
		} catch {
			// Services can reject connections while starting; readiness is checked again until timeout.
		}
		await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
	}
	throw new Error(`Timed out waiting for ${description}.`);
}

async function cleanup() {
	for (const child of [...children].reverse()) {
		if (child.exitCode === null) child.kill('SIGTERM');
	}
	await Promise.race([
		Promise.all(children.map((child) => new Promise((resolveExit) => {
			if (child.exitCode !== null) resolveExit();
			else child.once('exit', () => resolveExit());
		}))),
		new Promise((resolveExit) => setTimeout(resolveExit, 10_000))
	]);
	if (databaseStarted) runDocker(['rm', '--force', containerName]);
}

export async function startLocalStack() {
	const require = createRequire(import.meta.url);
	const tsNode = require.resolve('ts-node/dist/bin.js', { paths: [backendDirectory] });
	const serverScript = resolve(frontendDirectory, 'e2e/playwright/serve-frontend.mjs');
	const backendEnvironment = { ...process.env };
	for (const key of Object.keys(backendEnvironment)) {
		if (key.startsWith('DB_')) delete backendEnvironment[key];
	}
	Object.assign(backendEnvironment, {
		NODE_ENV: 'test',
		PORT: '3001',
		TEST_DB_HOST: '127.0.0.1',
		TEST_DB_PORT: '55439',
		TEST_DB_USERNAME: 'postgres',
		TEST_DB_PASSWORD: 'password-reset-e2e-only',
		TEST_DB_NAME: databaseName,
		DB_MIGRATIONS_RUN: 'true',
		JWT_SECRET: 'local-password-reset-e2e-access-secret',
		JWT_REFRESH_SECRET: 'local-password-reset-e2e-refresh-secret',
		AUTH_EXPOSE_RESET_TOKEN: 'false',
		AUTH_EXPOSE_VERIFICATION_TOKEN: 'false',
		EMAIL_DELIVERY_ENABLED: 'true',
		EMAIL_FROM: 'StrollBar E2E <e2e@example.test>',
		BREVO_API_KEY: 'mocked-test-only-not-a-brevo-key',
		PASSWORD_RESET_URL: 'http://127.0.0.1:4201/auth/reset-password',
		PASSWORD_RESET_TOKEN_TTL_MINUTES: '15',
		RECAPTCHA_ENABLED: 'false',
		CORS_ORIGINS: 'http://127.0.0.1:4201',
		DB_POOL_MAX: '5',
		DB_POOL_MIN: '0'
	});

	try {
		console.log(`Starting disposable PostgreSQL 17 container with database ${databaseName}.`);
		databaseStarted = true;
		runDocker([
			'run', '--detach', '--rm', '--name', containerName,
			'-p', '127.0.0.1:55439:5432',
			'-e', 'POSTGRES_USER=postgres',
			'-e', 'POSTGRES_PASSWORD=password-reset-e2e-only',
			'-e', `POSTGRES_DB=${databaseName}`,
			'postgres:17'
		]);
		databaseStarted = true;
		await waitUntil(`PostgreSQL database ${databaseName}`, async () => {
			const result = spawnSync('docker', ['exec', containerName, 'pg_isready', '-U', 'postgres', '-d', databaseName], {
				encoding: 'utf8',
				windowsHide: true
			});
			return result.status === 0;
		}, 240_000);

		console.log('Starting the real Nest API against the isolated database; email delivery is captured locally.');
		start(process.execPath, [tsNode, '--project', 'tsconfig.spec.json', 'test/password-reset-e2e-server.ts'], {
			cwd: backendDirectory,
			env: backendEnvironment
		});
		await waitUntil('local backend database health', async () => {
			const response = await fetch('http://127.0.0.1:3001/v1/health/db', { signal: AbortSignal.timeout(2000) });
			return response.ok;
		});

		console.log('Starting the Angular SSR handler used by the Vercel function.');
		start(process.execPath, [
			'--require',
			resolve(frontendDirectory, 'e2e/playwright/local-only-ssr-api.cjs'),
			'dist/strollbar-frontend/server/server.mjs'
		], {
			cwd: frontendDirectory,
			env: {
				...process.env,
				PORT: '4201',
				NG_ALLOWED_HOSTS: '127.0.0.1,localhost,strollbar.app,www.strollbar.app,stroll-bar.vercel.app'
			}
		});
		await waitUntil('local Angular app shell', async () => {
			const response = await fetch('http://127.0.0.1:4201/', { signal: AbortSignal.timeout(2000) });
			return response.ok;
		});
		console.log('Local password reset E2E stack is ready.');
		return cleanup;
	} catch (error) {
		await cleanup();
		throw error;
	}
}
