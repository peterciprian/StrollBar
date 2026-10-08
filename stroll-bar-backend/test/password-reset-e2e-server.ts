import 'reflect-metadata';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { StructuredExceptionFilter } from '../src/common/filters/structured-exception.filter';
import { VersionedResponseInterceptor } from '../src/common/interceptors/versioned-response.interceptor';
import { AuthService } from '../src/modules/auth/auth.service';
import { EmailService } from '../src/modules/email/email.service';
import { PreferredLanguage, UserEntity } from '../src/modules/users/entities/user.entity';
import { configureIsolatedTestDatabase } from './isolated-test-database';

type CapturedEmail = {
	to?: { email: string }[];
	subject?: string;
	textContent?: string;
	htmlContent?: string;
};

const mailbox: CapturedEmail[] = [];
let accountSequence = 0;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
	response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
	response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.from(chunk));
		if (Buffer.concat(chunks).length > 8192) {
			throw new Error('Test harness request body exceeds 8 KB.');
		}
	}
	return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function main(): Promise<void> {
	await configureIsolatedTestDatabase();
	if (process.env.NODE_ENV !== 'test' || process.env.DB_MIGRATIONS_RUN !== 'true') {
		throw new Error('Password reset E2E harness requires its isolated test database configuration.');
	}
	if (process.env.PORT !== '3001' || process.env.PASSWORD_RESET_URL !== 'http://127.0.0.1:4201/auth/reset-password') {
		throw new Error('Password reset E2E harness received an unexpected API port or email-link URL.');
	}

	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('v1');
	app.enableCors({ origin: ['http://127.0.0.1:4201'] });
	app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
	app.useGlobalFilters(new StructuredExceptionFilter());
	app.useGlobalInterceptors(new VersionedResponseInterceptor());

	const emailService = app.get(EmailService);
	Object.defineProperty(emailService, 'getBrevoClient', {
		configurable: true,
		value: () => ({
			transactionalEmails: {
				sendTransacEmail: async (message: CapturedEmail) => {
					mailbox.push(message);
					return { messageId: 'local-password-reset-e2e' };
				}
			},
			account: { getAccount: async () => ({}) }
		})
	});

	await app.listen(3001, '127.0.0.1');
	const authService = app.get(AuthService);
	const users = app.get(DataSource).getRepository(UserEntity);
	const harness = createServer(async (request, response) => {
		try {
			const url = new URL(request.url ?? '/', 'http://127.0.0.1:3101');
			if (request.method === 'GET' && url.pathname === '/__e2e/health') {
				sendJson(response, 200, { status: 'ok' });
				return;
			}
			if (request.method === 'POST' && url.pathname === '/__e2e/account') {
				const input = await readJson(request);
				const email = input.email;
				const password = input.password;
				if (
					typeof email !== 'string' ||
					!/^[a-z0-9._+-]+@example\.test$/i.test(email) ||
					typeof password !== 'string' ||
					password.length < 12
				) {
					sendJson(response, 400, { error: 'Provide a unique example.test address and a 12-character password.' });
					return;
				}
				const registration = await authService.register({
					email,
					password,
					username: `pwreset-e2e-${Date.now().toString(36)}-${++accountSequence}`,
					preferredLanguage: PreferredLanguage.HU
				});
				await users.update({ id: registration.user.id }, { emailVerified: true });
				sendJson(response, 201, { email, password });
				return;
			}
			if (request.method === 'GET' && url.pathname === '/__e2e/mailbox') {
				const email = url.searchParams.get('email');
				const matches = mailbox
					.filter((item) => item.to?.some((recipient) => recipient.email === email))
					.filter((item) => /password|jelszó/i.test(item.subject ?? ''));
				const message = matches[matches.length - 1];
				if (!message) {
					sendJson(response, 404, { error: 'No captured password reset email for this test account.' });
					return;
				}
				sendJson(response, 200, message);
				return;
			}
			if (request.method === 'POST' && url.pathname === '/__e2e/expire-reset') {
				const input = await readJson(request);
				if (typeof input.email !== 'string') {
					sendJson(response, 400, { error: 'An account email is required.' });
					return;
				}
				const user = await users.findOneBy({ email: input.email });
				if (!user?.resetPasswordTokenHash) {
					sendJson(response, 404, { error: 'No pending reset token exists for this test account.' });
					return;
				}
				await users.update({ id: user.id }, { resetPasswordExpiresAt: new Date(Date.now() - 1000) });
				sendJson(response, 200, { status: 'expired' });
				return;
			}
			sendJson(response, 404, { error: 'Not found.' });
		} catch (error) {
			sendJson(response, 500, { error: error instanceof Error ? error.message : 'Test harness failure.' });
		}
	});
	await new Promise<void>((resolve) => harness.listen(3101, '127.0.0.1', resolve));

	const shutdown = async () => {
		await new Promise<void>((resolve, reject) => harness.close((error) => (error ? reject(error) : resolve())));
		await app.close();
	};
	process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
	process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
	console.log('Password reset E2E API and private mailbox harness ready on loopback.');
}

void main().catch((error: unknown) => {
	console.error('Password reset E2E harness failed to start.', error);
	process.exitCode = 1;
});
