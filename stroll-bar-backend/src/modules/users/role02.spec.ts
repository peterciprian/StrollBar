import { ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import { scryptSync } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { RecaptchaGuard } from '../../common/guards/recaptcha.guard';
import { AdventuresService } from '../adventures/adventures.service';
import { AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { StagesService } from '../stages/stages.service';
import { StrollActiveStatus as Status, StrollEntity, StrollPublicityFlag as Publicity } from '../strolls/entities/stroll.entity';
import { StrollsController } from '../strolls/strolls.controller';
import { StrollsService } from '../strolls/strolls.service';
import { EffectiveRoleService } from './effective-role.service';
import { PaidGrantEntity, PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import { UserEntity, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

describe('ROLE-02 request-time authorization and quota integration', () => {
	const startsAt = new Date('2026-11-04T12:00:00.000Z');
	const expiresAt = new Date('2026-12-04T12:00:00.000Z');
	const secret = 'role02-test-secret';
	const jwt = new JwtService({ secret });
	let app: INestApplication;
	let rows: StrollEntity[];
	let grants: PaidGrantEntity[];
	let user: UserEntity;
	let purchaseCount: number;
	let existingAdventure: any;
	const query: any = {};
	for (const method of ['innerJoin', 'where', 'andWhere']) query[method] = jest.fn(() => query);
	query.getCount = jest.fn(async () => purchaseCount);
	const users = {
		findOne: jest.fn(async ({ where }) => where.id === user.id ? user : null),
		find: jest.fn(async () => [user]),
		update: jest.fn().mockResolvedValue({ affected: 1 }),
		save: jest.fn(async (changes) => changes)
	};
	const strolls = {
		count: jest.fn(async ({ where }) => rows.filter((row) =>
			row.authorId === where.authorId && (typeof where.publicityFlag === 'string'
				? row.publicityFlag === where.publicityFlag : row.publicityFlag !== Publicity.PUBLIC)
		).length),
		findOne: jest.fn(async ({ where }) => rows.find((row) => row.id === where.id)),
		create: jest.fn((value) => value),
		save: jest.fn(async (value) => value),
		delete: jest.fn(async ({ id }) => { rows = rows.filter((row) => row.id !== id); })
	};
	const stages = {
		find: jest.fn(async () => [{ id: 'stage', name: 'Stage', description: 'Description', address: 'Budapest', orderIndex: 1 }]),
		findOne: jest.fn(), save: jest.fn(), remove: jest.fn(), delete: jest.fn(), create: jest.fn()
	};
	const adventures = {
		findOne: jest.fn(async () => existingAdventure),
		create: jest.fn((value) => value),
		save: jest.fn(async (value) => value),
		createQueryBuilder: jest.fn(() => query)
	};
	const cache = { deleteByPrefix: jest.fn(), get: jest.fn(), set: jest.fn() };
	const badges = { evaluateAndAward: jest.fn().mockResolvedValue([]) };
	const email = { sendStrollStatusChangedEmail: jest.fn().mockResolvedValue(undefined) };
	const effectiveRoles = new EffectiveRoleService({ find: jest.fn(async () => grants) } as never);
	const dataSource = { transaction: async (run: (manager: unknown) => Promise<unknown>) => run({
		findOneOrFail: async () => user, getRepository: () => strolls
	}) };
	const strollService = new StrollsService(strolls as never, stages as never, adventures as never, users as never,
		cache as never, badges as never, email as never, dataSource as never);
	const stageService = new StagesService(stages as never, strolls as never, adventures as never, cache as never);
	const adventureService = new AdventuresService(adventures as never, {} as never, strolls as never, stages as never,
		users as never, {} as never, badges as never, email as never);
	const authService = new AuthService(users as never, {} as never, jwt, new ConfigService({ JWT_REFRESH_SECRET: secret }), {} as never, {} as never,
		{} as never, {} as never, effectiveRoles);
	const usersService = new UsersService(users as never, strolls as never, adventures as never, {} as never, effectiveRoles);
	const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: secret }), users as never, effectiveRoles);

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
			controllers: [StrollsController, AuthController],
			providers: [
				JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard, EmailVerifiedGuard,
				{ provide: ConfigService, useValue: new ConfigService({ JWT_SECRET: secret }) },
				{ provide: getRepositoryToken(UserEntity), useValue: users },
				{ provide: EffectiveRoleService, useValue: effectiveRoles },
				{ provide: StrollsService, useValue: strollService },
				{ provide: AuthService, useValue: authService }
			]
		}).overrideGuard(RecaptchaGuard).useValue({ canActivate: () => true }).compile();
		app = module.createNestApplication({ logger: false });
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
		await app.init();
	});
	afterAll(async () => { await app?.close(); });
	beforeEach(() => {
		jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
		jest.setSystemTime(startsAt);
		jest.clearAllMocks();
		user = Object.assign(new UserEntity(), {
			id: 'owner', role: UserRole.PREMIUM, authVersion: 0, email: 'owner@example.com',
			username: 'owner', emailVerified: true, isActive: true
		});
		grants = [Object.assign(new PaidGrantEntity(), { plan: PaidPlan.CREATOR, status: PaidGrantStatus.ACTIVE, startsAt, expiresAt })];
		rows = [row('one', Publicity.PUBLIC, Status.DRAFT), row('two', Publicity.PUBLIC, Status.ARCHIVED), row('three', Publicity.PUBLIC, Status.SUSPENDED)];
		purchaseCount = 10;
		existingAdventure = null;
	});
	afterEach(() => jest.useRealTimers());

	function row(id: string, publicityFlag = Publicity.PUBLIC, activeStatus = Status.DRAFT): StrollEntity {
		return Object.assign(new StrollEntity(), { id, authorId: 'owner', name: 'Walk', description: 'Description', publicityFlag, activeStatus });
	}
	function token(role = UserRole.PREMIUM) {
		return jwt.sign({ sub: user.id, authVersion: 0, role });
	}
	async function current(role = UserRole.PREMIUM) {
		return strategy.validate({ sub: user.id, email: 'forged@example.com', username: 'forged', role });
	}

	it.each([
		['before start', startsAt.getTime() - 1, 403],
		['exact start', startsAt.getTime(), 201],
		['just before expiry', expiresAt.getTime() - 1, 201],
		['exact expiry', expiresAt.getTime(), 403],
		['after expiry', expiresAt.getTime() + 1, 403]
	])('%s enforces the effective creation quota through signed JWT and real HTTP guards', async (_label, time, status) => {
		const staleToken = token();
		jest.setSystemTime(time);
		await request(app.getHttpServer()).post('/strolls').set('Authorization', `Bearer ${staleToken}`)
			.send({ name: 'New', description: 'Draft' }).expect(status);
		expect(strolls.save).toHaveBeenCalledTimes(status === 201 ? 1 : 0);
		for (const [options] of strolls.count.mock.calls) expect(options.where).not.toHaveProperty('activeStatus');
	});

	it('rejects forged body roles and rejects invalid signatures before mutation', async () => {
		await request(app.getHttpServer()).post('/strolls').set('Authorization', `Bearer ${token()}`)
			.send({ name: 'New', role: UserRole.ADMIN }).expect(400);
		const forged = new JwtService({ secret: 'wrong-secret' }).sign({ sub: user.id, role: UserRole.ADMIN });
		await request(app.getHttpServer()).post('/strolls').set('Authorization', `Bearer ${forged}`).send({ name: 'New' }).expect(401);
		expect(strolls.save).not.toHaveBeenCalled();
	});

	it('cannot gain ADMIN or paid access via old claims, stored legacy roles, or a stale UI', async () => {
		jest.setSystemTime(expiresAt);
		for (const claim of [UserRole.ADMIN, UserRole.PREMIUM, UserRole.CREATOR]) {
			const identity = await current(claim);
			expect(identity).toMatchObject({ role: UserRole.SIMPLE, email: user.email, username: user.username });
			await expect(strollService.bulkImport({} as never, identity)).rejects.toThrow(ForbiddenException);
		}
		expect(cache.get).not.toHaveBeenCalled();
	});

	it('current-user, profile update and admin listing return fresh roles with no-store HTTP semantics', async () => {
		const staleToken = token();
		const read = () => request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${staleToken}`);
		expect((await read().expect('Cache-Control', 'no-store').expect(200)).body.role).toBe(UserRole.CREATOR);
		jest.setSystemTime(expiresAt);
		expect((await read().expect('Cache-Control', 'no-store').expect(200)).body.role).toBe(UserRole.SIMPLE);
		expect(await usersService.updateMe(user.id, { username: user.username })).toMatchObject({ role: UserRole.SIMPLE });
		expect(await usersService.listAll({ ...(await current()), role: UserRole.ADMIN })).toEqual([
			expect.objectContaining({ role: UserRole.SIMPLE })
		]);
		expect(user.role).toBe(UserRole.PREMIUM);
	});

	it('login and legacy refresh return effective roles and mint tokens without role authority', async () => {
		const salt = 'role02-fixed-test-salt';
		user.passwordHash = `${salt}:${scryptSync('Password123!', salt, 64).toString('hex')}`;
		users.findOne.mockResolvedValueOnce(user);
		const login = await authService.login({ email: user.email, password: 'Password123!' });
		expect(login.user.role).toBe(UserRole.CREATOR);
		expect(jwt.decode(login.accessToken)).not.toHaveProperty('role');
		expect(jwt.decode(login.refreshToken)).not.toHaveProperty('role');
		const staleRefresh = token(UserRole.ADMIN);
		user.refreshTokenHash = `${salt}:${scryptSync(staleRefresh, salt, 64).toString('hex')}`;
		jest.setSystemTime(expiresAt);
		const refresh = await authService.refresh(staleRefresh);
		expect(refresh.user.role).toBe(UserRole.SIMPLE);
		expect(jwt.decode(refresh.accessToken)).not.toHaveProperty('role');
		expect(jwt.decode(refresh.refreshToken)).not.toHaveProperty('role');
	});

	it('SIMPLE defaults new drafts to PUBLIC and permits the third, but not the fourth, non-deleted stroll', async () => {
		jest.setSystemTime(expiresAt);
		rows.pop();
		const response = await request(app.getHttpServer()).post('/strolls').set('Authorization', `Bearer ${token()}`)
			.send({ name: 'New', description: '' }).expect(201);
		expect(response.body).toMatchObject({ publicityFlag: Publicity.PUBLIC, activeStatus: Status.DRAFT });
		rows.push(row('third'));
		await expect(strollService.create({ name: 'Fourth', description: '' }, await current())).rejects.toThrow(ForbiddenException);
	});

	it.each([Publicity.PRIVATE, Publicity.UNLISTED])('groups %s with all non-public drafts/archived rows', async (publicityFlag) => {
		rows = [row('private', Publicity.PRIVATE), row('unlisted', Publicity.UNLISTED, Status.ARCHIVED), row('suspended', Publicity.PRIVATE, Status.SUSPENDED)];
		await expect(strollService.create({ name: 'Fourth', description: '', publicityFlag }, await current())).rejects.toThrow(ForbiddenException);
		jest.setSystemTime(expiresAt);
		await expect(strollService.create({ name: 'First', description: '', publicityFlag }, await current())).rejects.toThrow(ForbiddenException);
	});

	it('enforces the CREATOR public limit and permits edits at the limit', async () => {
		rows = Array.from({ length: 20 }, (_, index) => row(String(index)));
		const identity = await current();
		await expect(strollService.create({ name: 'Twenty-first', description: '' }, identity)).rejects.toThrow(ForbiddenException);
		await expect(strollService.update('0', { name: 'Edited' }, identity)).resolves.toMatchObject({ name: 'Edited' });
		rows.push(row('twenty-first'));
		await expect(strollService.update('0', { name: 'Neutral' }, identity)).rejects.toThrow(ForbiddenException);
	});

	it.each([Status.DRAFT, Status.PUBLISHED, Status.ARCHIVED])('allows %s status edits at SIMPLE limit but not above it', async (activeStatus) => {
		jest.setSystemTime(expiresAt);
		const identity = await current();
		await expect(strollService.update('one', { activeStatus }, identity)).resolves.toMatchObject({ activeStatus });
		rows.push(row('fourth'));
		await expect(strollService.update('one', { activeStatus }, identity)).rejects.toThrow(ForbiddenException);
	});

	it('allows corrective publicity edits with remaining excess, rejects neutral/worsening edits, and permits whole-stroll deletion', async () => {
		jest.setSystemTime(expiresAt);
		rows = [row('public'), row('private', Publicity.PRIVATE), row('unlisted', Publicity.UNLISTED), row('extra', Publicity.PRIVATE)];
		const identity = await current();
		await expect(strollService.update('private', { name: 'Neutral' }, identity)).rejects.toThrow(ForbiddenException);
		await expect(strollService.update('unlisted', { publicityFlag: Publicity.PRIVATE }, identity)).rejects.toThrow(ForbiddenException);
		await expect(strollService.update('private', { publicityFlag: Publicity.PUBLIC }, identity)).resolves.toMatchObject({ publicityFlag: Publicity.PUBLIC });
		rows.push(row('third-public'));
		await expect(strollService.update('unlisted', { publicityFlag: Publicity.PUBLIC }, identity)).rejects.toThrow(ForbiddenException);
		await expect(strollService.remove('extra', identity)).resolves.toMatchObject({ deleted: true });
	});

	it.each(['create', 'update', 'reorder', 'remove'] as const)('blocks neutral stage %s while over quota after expiry', async (operation) => {
		jest.setSystemTime(expiresAt);
		rows = [row('private', Publicity.PRIVATE)];
		const identity = await current();
		const calls = {
			create: () => stageService.create('private', {} as never, identity),
			update: () => stageService.update('private', 'stage', {}, identity),
			reorder: () => stageService.reorder('private', { items: [] }, identity),
			remove: () => stageService.remove('private', 'stage', identity)
		};
		await expect(calls[operation]()).rejects.toThrow(ForbiddenException);
		expect(stages.save).not.toHaveBeenCalled();
		expect(stages.remove).not.toHaveBeenCalled();
	});

	it('enforces unlock quota at expiry but preserves an individually acquired adventure and private purchase capacity', async () => {
		rows = [Object.assign(row('walk', Publicity.PUBLIC, Status.PUBLISHED), { authorId: 'other' })];
		await expect(adventureService.unlock({ strollId: 'walk' }, await current())).resolves.toBeDefined();
		jest.setSystemTime(expiresAt);
		await expect(adventureService.unlock({ strollId: 'walk' }, await current())).rejects.toThrow(ForbiddenException);
		purchaseCount = 9;
		await expect(adventureService.unlock({ strollId: 'walk' }, await current())).resolves.toBeDefined();
		purchaseCount = 10;
		existingAdventure = { id: 'purchased', ownerUserId: user.id, progressStatus: AdventureProgressStatus.IN_PROGRESS };
		await expect(adventureService.unlock({ strollId: 'walk' }, await current())).resolves.toBe(existingAdventure);
		existingAdventure = null;
		rows[0].publicityFlag = Publicity.PRIVATE;
		await expect(adventureService.unlock({ strollId: 'walk' }, await current())).resolves.toBeDefined();
	});

	it('preserves individually purchased private content and stages after subscription expiry', async () => {
		jest.setSystemTime(expiresAt);
		rows = [Object.assign(row('private', Publicity.PRIVATE, Status.PUBLISHED), { authorId: 'other' })];
		existingAdventure = { id: 'purchase', ownerUserId: user.id, progressStatus: AdventureProgressStatus.IN_PROGRESS };
		const identity = await current();
		expect(identity.role).toBe(UserRole.SIMPLE);
		await expect(strollService.findOne('private', identity)).resolves.toBeDefined();
		await expect(stageService.list('private', identity)).resolves.toBeDefined();
	});

	it('preserves independent ADMIN capabilities after every paid grant expires', async () => {
		user.role = UserRole.ADMIN;
		jest.setSystemTime(expiresAt);
		expect(await current(UserRole.SIMPLE)).toMatchObject({ role: UserRole.ADMIN });
		await expect(strollService.create({ name: 'Admin private', description: '', publicityFlag: Publicity.PRIVATE }, await current(UserRole.SIMPLE)))
			.resolves.toMatchObject({ publicityFlag: Publicity.PRIVATE });
	});
});
