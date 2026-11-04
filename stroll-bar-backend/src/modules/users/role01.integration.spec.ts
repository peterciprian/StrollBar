import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AuditEventEntity } from '../../common/audit.entity';
import { buildDataSourceOptions } from '../../database/database.config';
import { runLegacyCutover } from '../../database/legacy-role-cutover.cli';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StagesService } from '../stages/stages.service';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag as Publicity } from '../strolls/entities/stroll.entity';
import { StrollsService } from '../strolls/strolls.service';
import { LegacyRoleCutoverEntity } from './entities/legacy-role-cutover.entity';
import { PaidGrantEntity, PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import { RoleLifecycleOutboxEntity, RoleLifecycleEventType } from './entities/role-lifecycle-outbox.entity';
import { UserEntity, UserRole } from './entities/user.entity';
import { earliestCutover, LegacyRoleCutover } from './legacy-role-cutover';
import { RoleAssignmentsService } from './role-assignments.service';

// This suite never derives a database target from application DB_* settings.
const isolated = process.env.ROLE01_TEST_ISOLATED === '1' && !!process.env.ROLE01_TEST_PG_PORT;
const integration = isolated ? describe : describe.skip;

integration('ROLE-01 disposable PostgreSQL integration', () => {
	let ds: DataSource;
	let adminClient: Client;
	const database = `role01_${randomUUID().replace(/-/g, '')}`;
	let users: Record<UserRole, UserEntity>;
	let actor: AuthenticatedUser;
	let assignments: RoleAssignmentsService;
	let cutover: LegacyRoleCutover;
	let strolls: StrollsService;
	let stages: StagesService;
	const cache = { deleteByPrefix: jest.fn().mockResolvedValue(undefined) };
	const email = {
		sendStrollCreatedEmail: jest.fn().mockResolvedValue(undefined),
		sendStrollStatusChangedEmail: jest.fn().mockResolvedValue(undefined)
	};

	beforeAll(async () => {
		const connection = {
			host: '127.0.0.1', port: Number(process.env.ROLE01_TEST_PG_PORT),
			user: 'role01_test', password: '', database: 'postgres', ssl: false as const
		};
		adminClient = new Client(connection);
		await adminClient.connect();
		await adminClient.query(`CREATE DATABASE "${database}"`);
		ds = new DataSource({
			...buildDataSourceOptions(), host: connection.host, port: connection.port,
			username: connection.user, password: '', database, ssl: false,
			migrationsRun: false, synchronize: false
		} as any);
		await ds.initialize();
		await ds.runMigrations();
		assignments = new RoleAssignmentsService(ds, { dispatchOne: jest.fn() } as never);
		cutover = new LegacyRoleCutover(ds);
		strolls = new StrollsService(
			ds.getRepository(StrollEntity), ds.getRepository(StageEntity), ds.getRepository(AdventureEntity),
			ds.getRepository(UserEntity), cache as never,
			{ evaluateAndAward: jest.fn().mockResolvedValue([]) } as never, email as never, ds
		);
		stages = new StagesService(ds.getRepository(StageEntity), ds.getRepository(StrollEntity), ds.getRepository(AdventureEntity), cache as never);
	}, 60000);

	afterAll(async () => {
		if (ds?.isInitialized) await ds.destroy();
		if (adminClient) {
			await adminClient.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
			await adminClient.end();
		}
	});

	beforeEach(async () => {
		await ds.query('TRUNCATE "audit_events", "role_lifecycle_outbox", "paid_grants", "legacy_role_cutovers", "users", "strolls", "adventures" CASCADE');
		users = {} as Record<UserRole, UserEntity>;
		for (const role of Object.values(UserRole)) {
			users[role] = await ds.getRepository(UserEntity).save(ds.getRepository(UserEntity).create({
				role, username: role, email: `${role}@role01.invalid`, passwordHash: 'isolated-test-only'
			}));
		}
		actor = asUser(users[UserRole.ADMIN]);
	});

	function asUser(user: UserEntity): AuthenticatedUser {
		return { userId: user.id, username: user.username, email: user.email, role: user.role };
	}

	async function seedStroll(user: UserEntity, publicityFlag = Publicity.PUBLIC, activeStatus = StrollActiveStatus.DRAFT) {
		return ds.getRepository(StrollEntity).save(ds.getRepository(StrollEntity).create({
			name: 'Owned stroll', description: 'Preserved content', authorId: user.id, publicityFlag, activeStatus
		}));
	}

	function grant(plan = PaidPlan.CREATOR) {
		return {
			plan, startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
			reason: 'Operator-approved bounded assignment'
		};
	}

	async function makeDue(userIds: string[]) {
		// Isolated fixture only: simulate waiting eight days; production operations cannot backdate notice.
		await ds.query(`UPDATE "legacy_role_cutovers"
			SET "noticeAt" = clock_timestamp() - interval '8 days', "cutoverAt" = clock_timestamp() - interval '1 day'
			WHERE "userId" = ANY($1::uuid[])`, [userIds]);
	}

	it('schema migration preserves representative roles/content and rolls back safely before use', async () => {
		const owned = await seedStroll(users[UserRole.CREATOR], Publicity.PRIVATE, StrollActiveStatus.ARCHIVED);
		const before = await ds.getRepository(UserEntity).find({ order: { id: 'ASC' } });
		await ds.undoLastMigration();
		await ds.undoLastMigration();
		await ds.runMigrations();
		expect(await ds.getRepository(UserEntity).find({ order: { id: 'ASC' } })).toEqual(before);
		expect(await ds.getRepository(StrollEntity).findOneByOrFail({ id: owned.id })).toMatchObject(owned);
		expect(await ds.getRepository(LegacyRoleCutoverEntity).count()).toBe(0);
		expect(await ds.getRepository(PaidGrantEntity).count()).toBe(0);
	});

	it('represents overlapping bounded grants without granting ADMIN or changing the role column', async () => {
		const user = users[UserRole.SIMPLE];
		const first = await assignments.createGrant(user.id, grant(), actor);
		const second = await assignments.createGrant(user.id, grant(PaidPlan.PREMIUM), actor);
		expect(first.id).not.toBe(second.id);
		expect(await ds.getRepository(PaidGrantEntity).countBy({ userId: user.id })).toBe(2);
		expect(await ds.getRepository(RoleLifecycleOutboxEntity).countBy({
			userId: user.id,
			eventType: RoleLifecycleEventType.PAID_GRANT_EXPIRY
		})).toBe(2);
		expect(await assignments.listGrants(user.id, actor)).toHaveLength(2);
		await expect(assignments.listGrants(user.id, asUser(user))).rejects.toThrow();
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: user.id })).role).toBe(UserRole.SIMPLE);
		await assignments.createGrant(actor.userId, grant(), actor);
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: actor.userId })).role).toBe(UserRole.ADMIN);
		await expect(assignments.createGrant(user.id, { ...grant(), plan: 'admin' as PaidPlan }, actor)).rejects.toThrow();
		await expect(ds.query(`UPDATE "paid_grants" SET "plan" = 'admin' WHERE "id" = $1`, [first.id])).rejects.toThrow();
		await expect(ds.query(`UPDATE "paid_grants" SET "expiresAt" = 'infinity' WHERE "id" = $1`, [first.id])).rejects.toThrow();
		await expect(assignments.createGrant(user.id, { ...grant(), expiresAt: grant().startsAt }, actor)).rejects.toThrow();
		await expect(ds.undoLastMigration()).rejects.toThrow('durable event history');
	});

	it('rejects permanent paid role writes and stale/non-admin actors', async () => {
		const simple = users[UserRole.SIMPLE];
		for (const role of [UserRole.CREATOR, UserRole.PREMIUM]) {
			await expect(assignments.assignAdmin(simple.id, role, actor)).rejects.toThrow('expiring grant');
		}
		await expect(assignments.assignAdmin(users[UserRole.CREATOR].id, UserRole.SIMPLE, actor)).rejects.toThrow('cutover');
		await expect(assignments.assignAdmin(simple.id, UserRole.ADMIN, { ...actor, userId: simple.id })).rejects.toThrow();
		await expect(assignments.createGrant(simple.id, grant(), { ...actor, userId: simple.id })).rejects.toThrow();
		await expect(assignments.assignAdmin(actor.userId, UserRole.SIMPLE, actor)).rejects.toThrow('own');
	});

	it('audits independent no-expiry admin assignment/removal and grant revocation without changing other grants', async () => {
		const user = users[UserRole.SIMPLE];
		const first = await assignments.createGrant(user.id, grant(), actor);
		const second = await assignments.createGrant(user.id, grant(PaidPlan.PREMIUM), actor);
		await assignments.assignAdmin(user.id, UserRole.ADMIN, actor, '127.0.0.1');
		await assignments.revokeGrant(user.id, first.id, 'Incorrect assignment', actor);
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: user.id })).role).toBe(UserRole.ADMIN);
		await assignments.assignAdmin(user.id, UserRole.SIMPLE, actor);
		expect((await ds.getRepository(PaidGrantEntity).findOneByOrFail({ id: second.id })).status).toBe(PaidGrantStatus.ACTIVE);
		expect(await ds.getRepository(AuditEventEntity).countBy({ userId: user.id })).toBe(5);
		await assignments.revokeGrant(user.id, first.id, 'Retry', actor);
		expect(await ds.getRepository(AuditEventEntity).countBy({ userId: user.id })).toBe(5);
	});

	it('rolls back assignments when durable audit insertion fails', async () => {
		await ds.query(`ALTER TABLE "audit_events" ADD CONSTRAINT "role01_test_audit_failure" CHECK (false) NOT VALID`);
		try {
			await expect(assignments.assignAdmin(users[UserRole.SIMPLE].id, UserRole.ADMIN, actor)).rejects.toThrow();
			await expect(assignments.createGrant(users[UserRole.SIMPLE].id, grant(), actor)).rejects.toThrow();
			expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: users[UserRole.SIMPLE].id })).role).toBe(UserRole.SIMPLE);
			expect(await ds.getRepository(PaidGrantEntity).count()).toBe(0);
			expect(await ds.getRepository(RoleLifecycleOutboxEntity).count()).toBe(0);
		} finally {
			await ds.query(`ALTER TABLE "audit_events" DROP CONSTRAINT "role01_test_audit_failure"`);
		}
	});

	it('previews without writes and rejects early, duplicate, non-legacy or partial notice batches', async () => {
		const ids = [users[UserRole.CREATOR].id, users[UserRole.PREMIUM].id];
		expect((await cutover.preview()).targets.map((user) => user.id).sort()).toEqual([...ids].sort());
		expect(await ds.getRepository(LegacyRoleCutoverEntity).count()).toBe(0);
		await expect(cutover.recordNotice(ids, new Date(Date.now() + 6 * 86400000), 'Delivered email', actor.userId)).rejects.toThrow('seven');
		await expect(cutover.recordNotice([...ids, actor.userId], new Date(Date.now() + 8 * 86400000), 'Delivered email', actor.userId)).rejects.toThrow('legacy');
		expect(await ds.getRepository(LegacyRoleCutoverEntity).count()).toBe(0);
		await cutover.recordNotice(ids, new Date(Date.now() + 8 * 86400000), 'Delivery receipt batch 123', actor.userId);
		await expect(cutover.recordNotice(ids, new Date(Date.now() + 9 * 86400000), 'Retry', actor.userId)).rejects.toThrow('already');
		await expect(cutover.cutover(ids, actor.userId)).rejects.toThrow('not yet due');
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: ids[0] })).role).toBe(UserRole.CREATOR);
	});

	it('runs the actual CLI against only the disposable database, requiring explicit apply and database confirmation', async () => {
		const settings = {
			DB_HOST: '127.0.0.1', DB_PORT: process.env.ROLE01_TEST_PG_PORT!, DB_NAME: database,
			DB_USERNAME: 'role01_test', DB_PASSWORD: '', DB_SSL: 'false', DB_MIGRATIONS_RUN: 'true'
		};
		const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
		Object.assign(process.env, settings);
		try {
			expect(await runLegacyCutover(['--operation=cutover'])).toMatchObject({ dryRun: true, target: { database } });
			expect(await ds.getRepository(LegacyRoleCutoverEntity).count()).toBe(0);
			const ids = [users[UserRole.CREATOR].id, users[UserRole.PREMIUM].id];
			const args = [`--users=${ids.join(',')}`, `--actor=${actor.userId}`, `--confirm-db=${database}`, '--apply'];
			await expect(runLegacyCutover([
				'--operation=notice', ...args, `--cutover-at=${new Date(Date.now() + 8 * 86400000).toISOString()}`,
				'--notice-reference=Isolated-test-delivery'
			])).resolves.toMatchObject({ noticed: 2 });
			await expect(runLegacyCutover(['--operation=cutover', ...args])).rejects.toThrow('not yet due');
			await makeDue(ids);
			await expect(runLegacyCutover(['--operation=cutover', ...args])).resolves.toMatchObject({ changed: 2 });
		} finally {
			for (const [key, value] of Object.entries(previous)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
		}
	});

	it('cuts over only noticed/due legacy users, preserves owned content/purchases and is safe to rerun', async () => {
		const creator = users[UserRole.CREATOR];
		const premium = users[UserRole.PREMIUM];
		const owned = await seedStroll(creator, Publicity.PRIVATE, StrollActiveStatus.ARCHIVED);
		await seedStroll(premium, Publicity.UNLISTED);
		await ds.getRepository(AdventureEntity).save(ds.getRepository(AdventureEntity).create({
			ownerUserId: creator.id, strollId: owned.id, purchaseTime: new Date()
		}));
		const contentBefore = await ds.getRepository(StrollEntity).find({ order: { id: 'ASC' } });
		const purchasesBefore = await ds.getRepository(AdventureEntity).find();
		const ids = [creator.id, premium.id];
		await cutover.recordNotice(ids, new Date(Date.now() + 8 * 86400000), 'Delivered legacy notice', actor.userId);
		await makeDue(ids);
		await expect(cutover.cutover([...ids, users[UserRole.SIMPLE].id], actor.userId)).rejects.toThrow('notice');
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: creator.id })).role).toBe(UserRole.CREATOR);
		expect(await cutover.cutover(ids, actor.userId)).toMatchObject({ changed: 2, contentChanges: 0, adminChanges: 0 });
		expect(await cutover.cutover(ids, actor.userId)).toMatchObject({ changed: 0, alreadyCompleted: 2 });
		for (const role of [UserRole.SIMPLE, UserRole.CREATOR, UserRole.PREMIUM]) {
			expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: users[role].id })).role).toBe(UserRole.SIMPLE);
		}
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: actor.userId })).role).toBe(UserRole.ADMIN);
		expect(await ds.getRepository(StrollEntity).find({ order: { id: 'ASC' } })).toEqual(contentBefore);
		expect(await ds.getRepository(AdventureEntity).find()).toEqual(purchasesBefore);
		expect(await ds.getRepository(AuditEventEntity).count()).toBe(4);
		// Controlled recovery records a bounded grant, never a permanent legacy role.
		await assignments.createGrant(creator.id, { ...grant(), reason: 'Recovery for noticed cutover; incident 123' }, actor);
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: creator.id })).role).toBe(UserRole.SIMPLE);
	});

	it('refuses to downgrade ADMIN if a noticed legacy account has changed role', async () => {
		const user = users[UserRole.CREATOR];
		await cutover.recordNotice([user.id], new Date(Date.now() + 8 * 86400000), 'Delivered', actor.userId);
		await makeDue([user.id]);
		await ds.getRepository(UserEntity).update(user.id, { role: UserRole.ADMIN });
		await expect(cutover.cutover([user.id], actor.userId)).rejects.toThrow('no longer matches');
		expect((await ds.getRepository(UserEntity).findOneByOrFail({ id: user.id })).role).toBe(UserRole.ADMIN);
	});

	it('counts drafts, archived and published rows, serializes concurrent creates and defaults drafts PUBLIC', async () => {
		const user = users[UserRole.SIMPLE];
		await seedStroll(user, Publicity.PUBLIC, StrollActiveStatus.DRAFT);
		await seedStroll(user, Publicity.PUBLIC, StrollActiveStatus.ARCHIVED);
		const results = await Promise.allSettled([
			strolls.create({ name: 'Third', description: 'Draft' }, asUser(user)),
			strolls.create({ name: 'Fourth', description: 'Draft' }, asUser(user))
		]);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(await ds.getRepository(StrollEntity).countBy({ authorId: user.id, publicityFlag: Publicity.PUBLIC })).toBe(3);
		const existing = await ds.getRepository(StrollEntity).findOneByOrFail({ authorId: user.id });
		for (const activeStatus of [StrollActiveStatus.PUBLISHED, StrollActiveStatus.SUSPENDED]) {
			await ds.getRepository(StrollEntity).update(existing.id, { activeStatus });
			await expect(strolls.create({ name: 'Over quota', description: 'Draft' }, asUser(user))).rejects.toThrow('quota');
		}
		await expect(strolls.create({ name: 'Private', description: 'Draft', publicityFlag: Publicity.UNLISTED }, asUser(user))).rejects.toThrow();
	});

	it('allows corrective edits but blocks neutral edits, publication and stage edits over quota; deletion stays available', async () => {
		const user = users[UserRole.SIMPLE];
		const first = await seedStroll(user, Publicity.PRIVATE);
		await seedStroll(user, Publicity.UNLISTED, StrollActiveStatus.ARCHIVED);
		await expect(strolls.update(first.id, { name: 'Neutral edit' }, asUser(user))).rejects.toThrow('quota');
		await expect(strolls.update(first.id, { activeStatus: StrollActiveStatus.PUBLISHED }, asUser(user))).rejects.toThrow('quota');
		await expect(stages.create(first.id, { name: 'Stage', description: '', orderIndex: 1 }, asUser(user))).rejects.toThrow('quota');
		const stage = await ds.getRepository(StageEntity).save(ds.getRepository(StageEntity).create({
			strollId: first.id, name: 'Existing stage', description: '', orderIndex: 1
		}));
		await expect(stages.update(first.id, stage.id, { name: 'Neutral edit' }, asUser(user))).rejects.toThrow('quota');
		await expect(stages.reorder(first.id, { items: [{ stageId: stage.id, orderIndex: 1 }] }, asUser(user))).rejects.toThrow('quota');
		await expect(stages.remove(first.id, stage.id, asUser(user))).resolves.toMatchObject({ deleted: true });
		const corrected = await strolls.update(first.id, { publicityFlag: Publicity.PUBLIC }, asUser(user));
		expect(corrected.publicityFlag).toBe(Publicity.PUBLIC);
		await expect(strolls.update(first.id, { description: 'Still over private quota' }, asUser(user))).rejects.toThrow('quota');
		await strolls.remove(first.id, asUser(user));
		expect(await ds.getRepository(StrollEntity).countBy({ authorId: user.id })).toBe(1);
	});
});

describe('legacy notice calendar policy', () => {
	it('adds seven UTC calendar days across month/year/leap-day and DST boundaries', () => {
		expect(earliestCutover(new Date('2024-02-25T13:00:00Z')).toISOString()).toBe('2024-03-03T13:00:00.000Z');
		expect(earliestCutover(new Date('2026-12-28T13:00:00Z')).toISOString()).toBe('2027-01-04T13:00:00.000Z');
		expect(earliestCutover(new Date('2026-10-23T13:00:00Z')).toISOString()).toBe('2026-10-30T13:00:00.000Z');
	});
});
