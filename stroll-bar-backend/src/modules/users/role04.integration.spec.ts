import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { configureIsolatedTestDatabase } from '../../../test/isolated-test-database';
import { AuditEventEntity } from '../../common/audit.entity';
import { buildDataSourceOptions } from '../../database/database.config';
import { RoleLifecycleDelivery1754500000000 } from '../../database/migrations/1754500000000-role-lifecycle-delivery';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailService } from '../email/email.service';
import { StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { effectiveRole, nextPlanTransition } from './effective-role.service';
import { PaidGrantEntity, PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import {
	RoleLifecycleEventType as EventType,
	RoleLifecycleOutboxEntity as Outbox,
	RoleLifecycleOutboxStatus as Status
} from './entities/role-lifecycle-outbox.entity';
import { PreferredLanguage, UserEntity, UserRole } from './entities/user.entity';
import { RoleAssignmentsService } from './role-assignments.service';
import { lifecycleRetryDelay, RoleLifecycleDispatcher } from './role-lifecycle-dispatcher.service';
import { UsersModule } from './users.module';

const integration = process.env.ROLE04_TEST_ISOLATED === '1' ? describe : describe.skip;

integration('ROLE-04 isolated PostgreSQL outbox/API/job lifecycle', () => {
	let app: INestApplication;
	let ds: DataSource;
	let assignments: RoleAssignmentsService;
	let dispatcher: RoleLifecycleDispatcher;
	let admin: UserEntity;
	let walker: UserEntity;
	let other: UserEntity;
	const email = { sendRoleLifecycleMessage: jest.fn() };
	const actor = (user: UserEntity): AuthenticatedUser => ({
		userId: user.id,
		username: user.username,
		email: user.email,
		role: user.role
	});

	beforeAll(async () => {
		await configureIsolatedTestDatabase();
		const module = await Test.createTestingModule({
			imports: [TypeOrmModule.forRoot({ ...buildDataSourceOptions(), migrationsRun: true }), UsersModule]
		})
			.overrideProvider(EmailService)
			.useValue(email)
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate: (context: any) => {
					const req = context.switchToHttp().getRequest();
					req.user = actor(req.headers['x-test-user'] === 'admin' ? admin : req.headers['x-test-user'] === 'other' ? other : walker);
					return true;
				}
			})
			.compile();
		app = module.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
		await app.init();
		ds = module.get(DataSource);
		assignments = module.get(RoleAssignmentsService);
		dispatcher = module.get(RoleLifecycleDispatcher);
	}, 60000);

	afterAll(async () => {
		if (app) await app.close();
	});

	beforeEach(async () => {
		await ds.query('TRUNCATE "audit_events", "users" CASCADE');
		email.sendRoleLifecycleMessage.mockReset().mockResolvedValue(undefined);
		const repo = ds.getRepository(UserEntity);
		admin = await repo.save(repo.create({ username: 'admin', email: 'admin@role04.invalid', passwordHash: 'fixture', role: UserRole.ADMIN }));
		walker = await repo.save(
			repo.create({
				username: 'walker',
				email: 'walker@role04.invalid',
				passwordHash: 'fixture',
				role: UserRole.SIMPLE,
				preferredLanguage: PreferredLanguage.EN
			})
		);
		other = await repo.save(repo.create({ username: 'other', email: 'other@role04.invalid', passwordHash: 'fixture', role: UserRole.SIMPLE }));
	});

	async function grant(user = walker, plan = PaidPlan.PREMIUM, expiresAt = new Date(Date.now() + 3600000)) {
		return assignments.createGrant(
			user.id,
			{
				plan,
				startsAt: new Date(Date.now() - 7200000).toISOString(),
				expiresAt: expiresAt.toISOString(),
				reason: 'ROLE-04 fixture'
			},
			actor(admin)
		);
	}

	async function due(grantId: string) {
		const at = new Date(Date.now() - 1000);
		await ds.getRepository(PaidGrantEntity).update(grantId, { expiresAt: at });
		await ds.getRepository(Outbox).update({ grantId, eventType: EventType.PAID_GRANT_EXPIRY }, { availableAt: at });
		return at;
	}

	it('atomically queues grants and audit, rolls back failures, and enforces one logical event per grant/type', async () => {
		const created = await grant();
		expect(await ds.getRepository(Outbox).count()).toBe(1);
		await expect(
			ds.getRepository(Outbox).insert({
				userId: walker.id,
				grantId: created.id,
				eventType: EventType.PAID_GRANT_EXPIRY,
				availableAt: created.expiresAt
			})
		).rejects.toThrow();
		const before = await ds.getRepository(PaidGrantEntity).count();
		// A database failure after grant/outbox inserts must roll both back.
		await ds.query(
			`CREATE FUNCTION role04_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit failure'; END $$`
		);
		await ds.query(`CREATE TRIGGER role04_fail_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION role04_fail_audit()`);
		try {
			await expect(grant()).rejects.toThrow('fixture audit failure');
		} finally {
			await ds.query('DROP TRIGGER role04_fail_audit ON audit_events; DROP FUNCTION role04_fail_audit()');
		}
		expect(await ds.getRepository(PaidGrantEntity).count()).toBe(before);
		expect(await ds.getRepository(Outbox).count()).toBe(1);
		expect(await ds.getRepository(AuditEventEntity).count()).toBe(1);
	});

	it('backfills pre-existing paid grants on upgrade and refuses rollback over durable history', async () => {
		const created = await grant();
		await ds.getRepository(Outbox).delete({ grantId: created.id });
		const migration = new RoleLifecycleDelivery1754500000000();
		const runner = ds.createQueryRunner();
		try {
			await migration.down(runner);
			await migration.up(runner);
			expect(await ds.getRepository(Outbox).findOneByOrFail({ grantId: created.id })).toMatchObject({
				eventType: EventType.PAID_GRANT_EXPIRY,
				availableAt: created.expiresAt,
				status: Status.PENDING
			});
			await expect(migration.down(runner)).rejects.toThrow('durable event history');
		} finally {
			await runner.release();
		}
	});

	it('does not send warnings or early expiry mail; concurrent dispatchers claim an expiry only once', async () => {
		const created = await grant();
		expect(await dispatcher.dispatchOne()).toBe('idle');
		expect(email.sendRoleLifecycleMessage).not.toHaveBeenCalled();
		await due(created.id);
		const results = await Promise.all(Array.from({ length: 10 }, () => dispatcher.dispatchOne()));
		expect(results.filter((result) => result === 'sent')).toHaveLength(1);
		expect(email.sendRoleLifecycleMessage).toHaveBeenCalledTimes(1);
		const event = await ds.getRepository(Outbox).findOneByOrFail({ grantId: created.id });
		expect(event).toMatchObject({ status: Status.SENT, attemptCount: 1, leaseToken: null });
		expect(event.sentAt).toBeInstanceOf(Date);
		expect(Date.now() - event.availableAt.getTime()).toBeLessThan(3600000);
	});

	it('automatically retries failures, freezes content, and recovers abandoned claims with the same dedupe key', async () => {
		const created = await grant();
		await due(created.id);
		email.sendRoleLifecycleMessage.mockRejectedValueOnce(new Error('ambiguous provider response with sensitive body'));
		expect(await dispatcher.dispatchOne()).toBe('retry');
		let event = await ds.getRepository(Outbox).findOneByOrFail({ grantId: created.id });
		expect(event).toMatchObject({ status: Status.PENDING, attemptCount: 1 });
		expect(event.lastError).not.toContain('sensitive');
		expect(event.availableAt.getTime()).toBeGreaterThan(Date.now());
		expect(await dispatcher.dispatchOne()).toBe('idle');
		const firstMessage = email.sendRoleLifecycleMessage.mock.calls[0][0];
		const firstKey = email.sendRoleLifecycleMessage.mock.calls[0][1];
		await ds.getRepository(UserEntity).update(walker.id, { preferredLanguage: PreferredLanguage.HU });
		// Simulate provider acceptance followed by a crash, recovered after its 30-minute dedupe window.
		await ds.getRepository(Outbox).update(event.id, {
			status: Status.PROCESSING,
			leaseUntil: new Date(Date.now() - 31 * 60000),
			leaseToken: admin.id
		});
		expect(await dispatcher.dispatchOne()).toBe('sent');
		event = await ds.getRepository(Outbox).findOneByOrFail({ id: event.id });
		expect(event.attemptCount).toBe(2);
		expect(email.sendRoleLifecycleMessage).toHaveBeenLastCalledWith(firstMessage, firstKey);
		expect(await dispatcher.dispatchOne()).toBe('idle');
		expect(lifecycleRetryDelay(1000)).toBe(600000);
		// This deliberately permits a second external acceptance; no exactly-once claim is made.
		expect(email.sendRoleLifecycleMessage).toHaveBeenCalledTimes(2);
	});

	it('fences unexpired leases and retries receipt-write failure after an accepted send', async () => {
		const created = await grant();
		await due(created.id);
		const event = await ds.getRepository(Outbox).findOneByOrFail({ grantId: created.id });
		await ds
			.getRepository(Outbox)
			.update(event.id, { status: Status.PROCESSING, leaseToken: admin.id, leaseUntil: new Date(Date.now() + 60000) });
		expect(await dispatcher.dispatchOne()).toBe('idle');
		await ds.getRepository(Outbox).update(event.id, { leaseUntil: new Date(Date.now() - 1) });
		await ds.query(
			`CREATE FUNCTION role04_fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'sent' THEN RAISE EXCEPTION 'receipt fixture'; END IF; RETURN NEW; END $$`
		);
		await ds.query(
			`CREATE TRIGGER role04_fail_receipt BEFORE UPDATE ON role_lifecycle_outbox FOR EACH ROW EXECUTE FUNCTION role04_fail_receipt()`
		);
		try {
			expect(await dispatcher.dispatchOne()).toBe('retry');
		} finally {
			await ds.query('DROP TRIGGER role04_fail_receipt ON role_lifecycle_outbox; DROP FUNCTION role04_fail_receipt()');
		}
		expect(email.sendRoleLifecycleMessage).toHaveBeenCalledTimes(1);
		expect(await ds.getRepository(Outbox).findOneByOrFail({ id: event.id })).toMatchObject({ status: Status.PENDING, sentAt: null });
	});

	it('self-service Cancel is idempotent and immediate, preserves exact paid-through access, and does not expose admin history', async () => {
		const created = await grant();
		const owned = await ds.getRepository(StrollEntity).save(
			ds.getRepository(StrollEntity).create({
				authorId: walker.id,
				name: 'Retained',
				description: 'Retained',
				publicityFlag: StrollPublicityFlag.PRIVATE
			})
		);
		const url = `/users/me/paid-grants/${created.id}/cancel`;
		const response = await request(app.getHttpServer()).post(url).expect(201);
		expect(response.body.status).toBe(PaidGrantStatus.CANCELLED);
		expect(response.body).not.toHaveProperty('reason');
		expect(response.body).not.toHaveProperty('actorUserId');
		expect(response.body.cancelledAt).toBeDefined();
		expect(email.sendRoleLifecycleMessage).toHaveBeenCalledTimes(1);
		await request(app.getHttpServer()).post(url).expect(201);
		expect(email.sendRoleLifecycleMessage).toHaveBeenCalledTimes(1);
		const current = await ds.getRepository(PaidGrantEntity).findOneByOrFail({ id: created.id });
		expect(effectiveRole(walker.role, [current], new Date(current.expiresAt.getTime() - 1))).toBe(UserRole.PREMIUM);
		expect(effectiveRole(walker.role, [current], current.expiresAt)).toBe(UserRole.SIMPLE);
		expect(await ds.getRepository(StrollEntity).findOneBy({ id: owned.id })).not.toBeNull();
		await request(app.getHttpServer()).get(`/users/${walker.id}/paid-grants`).expect(403);
		const own = await request(app.getHttpServer()).get('/users/me/entitlement').expect(200);
		expect(own.body.paidGrants[0]).not.toHaveProperty('reason');
		expect(own.body.paidGrants[0].status).toBe('cancelled');
		expect(await ds.getRepository(Outbox).countBy({ eventType: EventType.PAID_GRANT_CANCELLED })).toBe(1);
		await request(app.getHttpServer()).post(url).set('x-test-user', 'other').expect(404);
		await request(app.getHttpServer()).post(`/users/${walker.id}/paid-grants/${created.id}/revoke`).send({ reason: 'forged' }).expect(403);
	});

	it('cancellation failure stays queued; immediate admin Revoke remains separate and suppresses expiry mail', async () => {
		const created = await grant();
		email.sendRoleLifecycleMessage.mockRejectedValueOnce(new Error('offline'));
		await request(app.getHttpServer())
			.post(`/users/${walker.id}/paid-grants/${created.id}/cancel`)
			.set('x-test-user', 'admin')
			.send({ reason: 'Requested cancellation' })
			.expect(201);
		expect(await ds.getRepository(Outbox).findOneByOrFail({ grantId: created.id, eventType: EventType.PAID_GRANT_CANCELLED })).toMatchObject({
			status: Status.PENDING
		});
		await request(app.getHttpServer())
			.post(`/users/${walker.id}/paid-grants/${created.id}/revoke`)
			.set('x-test-user', 'admin')
			.send({ reason: 'Immediate removal' })
			.expect(201);
		const revoked = await ds.getRepository(PaidGrantEntity).findOneByOrFail({ id: created.id });
		expect(effectiveRole(walker.role, [revoked], new Date())).toBe(UserRole.SIMPLE);
		await due(created.id);
		expect(await dispatcher.dispatchOne()).toBe('skipped');
		expect(await ds.getRepository(Outbox).findOneByOrFail({ grantId: created.id, eventType: EventType.PAID_GRANT_EXPIRY })).toMatchObject({
			status: Status.SKIPPED
		});
	});

	it('serializes concurrent cancellations and denies other-account or stale ADMIN authority', async () => {
		const created = await grant();
		const url = `/users/me/paid-grants/${created.id}/cancel`;
		const results = await Promise.all([request(app.getHttpServer()).post(url), request(app.getHttpServer()).post(url)]);
		expect(results.map((result) => result.status)).toEqual([201, 201]);
		expect(email.sendRoleLifecycleMessage).toHaveBeenCalledTimes(1);
		expect(await ds.getRepository(Outbox).countBy({ eventType: EventType.PAID_GRANT_CANCELLED })).toBe(1);
		expect(await ds.getRepository(AuditEventEntity).count()).toBe(2);
		await expect(assignments.cancelGrant(walker.id, created.id, 'Other account', actor(other))).rejects.toThrow('administrator');
		await ds.getRepository(UserEntity).update(admin.id, { role: UserRole.SIMPLE });
		await expect(assignments.revokeGrant(walker.id, created.id, 'Stale ADMIN', actor(admin))).rejects.toThrow('administrator');
	});

	it('audits separate non-expiring ADMIN assignment/removal without changing the paid grant', async () => {
		const created = await grant(other);
		await assignments.assignAdmin(other.id, UserRole.ADMIN, actor(admin));
		let current = await ds.getRepository(UserEntity).findOneByOrFail({ id: other.id });
		expect(effectiveRole(current.role, [created], created.expiresAt)).toBe(UserRole.ADMIN);
		expect(await ds.getRepository(Outbox).count()).toBe(1);
		await assignments.assignAdmin(other.id, UserRole.SIMPLE, actor(admin));
		current = await ds.getRepository(UserEntity).findOneByOrFail({ id: other.id });
		expect(effectiveRole(current.role, [created], new Date())).toBe(UserRole.PREMIUM);
		const audits = await ds.getRepository(AuditEventEntity).find();
		expect(audits.filter((audit) => audit.metadata?.operation === 'admin_assignment')).toHaveLength(2);
		expect(email.sendRoleLifecycleMessage).not.toHaveBeenCalled();
		await expect(assignments.assignAdmin(other.id, UserRole.PREMIUM, actor(admin))).rejects.toThrow('expiring grant');
	});

	it.each(['suspended', 'inactive'])('does not send an expiry notice for a %s grant/account', async (state) => {
		const created = await grant();
		await due(created.id);
		if (state === 'suspended') await ds.getRepository(PaidGrantEntity).update(created.id, { status: PaidGrantStatus.SUSPENDED });
		else await ds.getRepository(UserEntity).update(walker.id, { isActive: false });
		expect(await dispatcher.dispatchOne()).toBe('skipped');
		expect(email.sendRoleLifecycleMessage).not.toHaveBeenCalled();
	});

	it('overlap wording and fallback dates reflect CREATOR after PREMIUM; ADMIN never expires with grants', async () => {
		const premium = await grant();
		const creator = await grant(walker, PaidPlan.CREATOR, new Date(premium.expiresAt.getTime() + 3600000));
		const transition = nextPlanTransition(walker.role, [premium, creator], new Date());
		expect(transition).toMatchObject({ plan: UserRole.PREMIUM, at: premium.expiresAt, nextPlan: UserRole.CREATOR });
		await due(premium.id);
		await dispatcher.dispatchOne();
		expect(email.sendRoleLifecycleMessage.mock.calls[0][0].textContent).toContain('currently recorded grants: CREATOR');
		const adminGrant = await grant(admin);
		await assignments.cancelGrant(admin.id, adminGrant.id, 'Cancel own grant only', actor(admin));
		expect(email.sendRoleLifecycleMessage.mock.calls[1][0].textContent).toContain('ADMIN');
		await due(adminGrant.id);
		await dispatcher.dispatchOne();
		expect(email.sendRoleLifecycleMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				subject: expect.stringContaining('lejárt'),
				textContent: expect.stringContaining('megvásárolt tartalmaid megmaradnak')
			}),
			expect.stringMatching(/^[0-9a-f-]{36}$/)
		);
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: admin.id })).role).toBe(UserRole.ADMIN);
		expect(effectiveRole(UserRole.ADMIN, [], new Date())).toBe(UserRole.ADMIN);
		expect(await ds.getRepository(AuditEventEntity).count()).toBe(4);
	});

	it('runs the compiled scheduler job without JWT/S3/HTTP dependencies and retries disabled delivery instead of marking sent', async () => {
		const created = await grant();
		await due(created.id);
		const result = spawnSync(process.execPath, [resolve('dist/jobs/role-lifecycle.cli.js')], {
			cwd: resolve('.'),
			timeout: 60000,
			encoding: 'utf8',
			env: {
				SystemRoot: process.env.SystemRoot,
				PATH: process.env.PATH,
				NODE_ENV: 'test',
				DB_HOST: '127.0.0.1',
				DB_PORT: process.env.TEST_DB_PORT,
				DB_USERNAME: process.env.TEST_DB_USERNAME,
				DB_PASSWORD: process.env.TEST_DB_PASSWORD,
				DB_NAME: process.env.TEST_DB_NAME,
				DB_SSL: 'false',
				EMAIL_DELIVERY_ENABLED: 'false'
			}
		});
		expect(result.error).toBeUndefined();
		expect(result.status).toBe(1);
		expect(result.stdout).toContain('role_mail_job_complete');
		expect(await ds.getRepository(Outbox).findOneByOrFail({ grantId: created.id })).toMatchObject({ status: Status.PENDING, attemptCount: 1 });
		const blueprint = readFileSync(resolve('../render.yaml'), 'utf8');
		expect(blueprint).toContain("schedule: '*/10 * * * *'");
		expect(blueprint).toContain('startCommand: npm run roles:dispatch');
	}, 70000);
});
