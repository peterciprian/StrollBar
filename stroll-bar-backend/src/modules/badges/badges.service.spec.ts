import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StrollActiveStatus } from '../strolls/entities/stroll.entity';
import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { UserRole } from '../users/entities/user.entity';
import { BadgeRuleCondition } from './badge-rules';
import { BadgesService } from './badges.service';
import { BadgeDefinitionEntity } from './entities/badge-definition.entity';
import { UserBadgeEntity } from './entities/user-badge.entity';

describe('BadgesService', () => {
	const attemptsQueryBuilder: Record<string, jest.Mock> = {
		select: jest.fn(() => attemptsQueryBuilder),
		where: jest.fn(() => attemptsQueryBuilder),
		andWhere: jest.fn(() => attemptsQueryBuilder),
		groupBy: jest.fn(() => attemptsQueryBuilder),
		innerJoin: jest.fn(() => attemptsQueryBuilder),
		addSelect: jest.fn(() => attemptsQueryBuilder),
		getRawMany: jest.fn()
	};
	let userBadgesRepository: any;
	let badgeDefinitionsRepository: any;
	let strollsRepository: any;
	let adventuresRepository: any;
	let adventureResultsRepository: any;
	let stageAttemptsRepository: any;
	let reviewsRepository: any;
	let loggerSpy: jest.SpyInstance;
	let service: BadgesService;

	const adminUser: AuthenticatedUser = { userId: 'admin-1', email: 'admin@example.com', username: 'admin', role: UserRole.ADMIN };
	const simpleUser: AuthenticatedUser = { userId: 'user-1', email: 'user@example.com', username: 'user', role: UserRole.SIMPLE };

	beforeEach(() => {
		Object.values(attemptsQueryBuilder).forEach((mock) => mock.mockClear());
		attemptsQueryBuilder.getRawMany.mockResolvedValue([]);
		userBadgesRepository = {
			count: jest.fn(),
			create: jest.fn((value) => value),
			delete: jest.fn().mockResolvedValue(undefined),
			find: jest.fn(),
			save: jest.fn(async (value) => value)
		};
		badgeDefinitionsRepository = {
			create: jest.fn((value) => value),
			delete: jest.fn().mockResolvedValue(undefined),
			find: jest.fn(),
			findOne: jest.fn(),
			save: jest.fn(async (value) => value)
		};
		strollsRepository = {
			count: jest.fn(),
			find: jest.fn()
		};
		adventuresRepository = { count: jest.fn() };
		adventureResultsRepository = { find: jest.fn() };
		stageAttemptsRepository = { createQueryBuilder: jest.fn(() => attemptsQueryBuilder) };
		reviewsRepository = { count: jest.fn() };
		loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		configureStats();

		service = new BadgesService(
			userBadgesRepository,
			badgeDefinitionsRepository,
			strollsRepository,
			adventuresRepository,
			adventureResultsRepository,
			stageAttemptsRepository,
			reviewsRepository
		);
	});

	afterEach(() => {
		loggerSpy.mockRestore();
	});

	it('awards newly qualifying badges and revokes badges that no longer qualify', async () => {
		badgeDefinitionsRepository.find.mockResolvedValue([
			buildDefinition('creator', [{ metric: 'createdStrollsCount', operator: 'gte', value: 1 }]),
			buildDefinition('reviewer', [{ metric: 'reviewsCount', operator: 'gte', value: 1 }])
		]);
		userBadgesRepository.find.mockResolvedValue([buildUserBadge('earned-reviewer', 'reviewer')]);
		configureStats({ createdStrollsCount: 1, reviewsCount: 0 });

		await expect(service.evaluateAndAward('user-1')).resolves.toEqual({ awarded: ['creator'], revoked: ['reviewer'] });
		expect(userBadgesRepository.create).toHaveBeenCalledWith({ userId: 'user-1', badgeCode: 'creator' });
		expect(userBadgesRepository.save).toHaveBeenCalledWith({ userId: 'user-1', badgeCode: 'creator' });
		expect(userBadgesRepository.delete).toHaveBeenCalledWith({ userId: 'user-1', badgeCode: 'reviewer' });
	});

	it('removes stale user badges whose definitions are no longer active', async () => {
		badgeDefinitionsRepository.find.mockResolvedValue([]);
		userBadgesRepository.find.mockResolvedValue([buildUserBadge('stale-badge-id', 'retired')]);

		await expect(service.evaluateAndAward('user-1')).resolves.toEqual({ awarded: [], revoked: [] });
		expect(userBadgesRepository.delete).toHaveBeenCalledWith({ id: expect.any(Object) });
	});

	it('evaluates meta badges after stat-based badge changes', async () => {
		badgeDefinitionsRepository.find.mockResolvedValue([
			buildDefinition('first-stroll', [{ metric: 'createdStrollsCount', operator: 'gte', value: 1 }]),
			buildDefinition('collector', [{ metric: 'totalBadgesEarned', operator: 'gte', value: 1 }])
		]);
		userBadgesRepository.find.mockResolvedValue([]);
		configureStats({ createdStrollsCount: 1 });

		await expect(service.evaluateAndAward('user-1')).resolves.toEqual({ awarded: ['first-stroll', 'collector'], revoked: [] });
		expect(userBadgesRepository.create).toHaveBeenCalledWith({ userId: 'user-1', badgeCode: 'first-stroll' });
		expect(userBadgesRepository.create).toHaveBeenCalledWith({ userId: 'user-1', badgeCode: 'collector' });
	});

	it('returns an empty side-effect result when badge evaluation fails', async () => {
		badgeDefinitionsRepository.find.mockRejectedValue(new Error('database unavailable'));

		await expect(service.evaluateAndAward('user-1')).resolves.toEqual({ awarded: [], revoked: [] });
	});

	it('sorts earned catalog entries before unearned entries', async () => {
		jest.spyOn(service, 'evaluateAndAward').mockResolvedValue({ awarded: [], revoked: [] });
		badgeDefinitionsRepository.find.mockResolvedValue([buildDefinition('unearned', []), buildDefinition('earned', [])]);
		userBadgesRepository.find.mockResolvedValue([buildUserBadge('earned-id', 'earned', new Date('2026-09-25T10:00:00.000Z'))]);

		const result = await service.getCatalogForUser('user-1');

		expect(result.map((badge) => badge.code)).toEqual(['earned', 'unearned']);
		expect(result[0]).toMatchObject({ earned: true, earnedAt: new Date('2026-09-25T10:00:00.000Z') });
		expect(result[1]).toMatchObject({ earned: false, earnedAt: null });
	});

	it('rejects badge definition administration for non-admin users', async () => {
		await expect(service.listDefinitionsForAdmin(simpleUser)).rejects.toThrow(ForbiddenException);
		await expect(
			service.createDefinition({ code: 'code', icon: 'star', title: 'Title', description: 'Description', rules: [] }, simpleUser)
		).rejects.toThrow(ForbiddenException);
	});

	it('creates admin badge definitions as active by default', async () => {
		badgeDefinitionsRepository.findOne.mockResolvedValue(null);

		await expect(
			service.createDefinition({ code: 'explorer', icon: 'map', title: 'Explorer', description: 'Create a stroll.', rules: [] }, adminUser)
		).resolves.toMatchObject({ code: 'explorer', active: true });
		expect(badgeDefinitionsRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'explorer', icon: 'map', title: 'Explorer', active: true, rules: [] })
		);
	});

	it('updates badge definitions without changing omitted fields', async () => {
		const definition = buildDefinition('explorer', [{ metric: 'createdStrollsCount', operator: 'gte', value: 1 }]);
		badgeDefinitionsRepository.findOne.mockResolvedValue(definition);

		await expect(service.updateDefinition(definition.id, { title: 'Updated title', active: false }, adminUser)).resolves.toMatchObject({
			code: 'explorer',
			title: 'Updated title',
			active: false,
			rules: definition.rules
		});
		expect(badgeDefinitionsRepository.save).toHaveBeenCalledWith(definition);
	});

	it('deletes a badge definition and all earned user badges for that code', async () => {
		const definition = buildDefinition('retired', []);
		badgeDefinitionsRepository.findOne.mockResolvedValue(definition);

		await expect(service.deleteDefinition(definition.id, adminUser)).resolves.toEqual({ id: definition.id, deleted: true });
		expect(badgeDefinitionsRepository.delete).toHaveBeenCalledWith({ id: definition.id });
		expect(userBadgesRepository.delete).toHaveBeenCalledWith({ badgeCode: 'retired' });
	});

	it('throws when updating a missing badge definition', async () => {
		badgeDefinitionsRepository.findOne.mockResolvedValue(null);

		await expect(service.updateDefinition('missing-definition', { title: 'Nope' }, adminUser)).rejects.toThrow(NotFoundException);
	});

	function configureStats(overrides: Partial<Record<string, number>> = {}) {
		const stats = {
			createdStrollsCount: 0,
			publishedStrollsCount: 0,
			purchasedStrollsCount: 0,
			activeStrollsCount: 0,
			completedStrollsCount: 0,
			reviewsCount: 0,
			...overrides
		};

		strollsRepository.count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
			where.activeStatus === StrollActiveStatus.PUBLISHED ? stats.publishedStrollsCount : stats.createdStrollsCount
		);
		adventuresRepository.count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
			if (where.progressStatus === AdventureProgressStatus.COMPLETED) return stats.completedStrollsCount;
			if (where.progressStatus) return stats.activeStrollsCount;
			return stats.purchasedStrollsCount;
		});
		reviewsRepository.count.mockResolvedValue(stats.reviewsCount);
		adventureResultsRepository.find.mockResolvedValue([]);
		strollsRepository.find.mockResolvedValue([]);
	}
});

function buildDefinition(code: string, rules: BadgeRuleCondition[]): BadgeDefinitionEntity {
	return {
		id: `${code}-definition-id`,
		code,
		icon: 'star',
		title: code,
		description: `${code} description`,
		active: true,
		rules,
		createdAt: new Date('2026-09-25T10:00:00.000Z'),
		updatedAt: new Date('2026-09-25T10:00:00.000Z'),
		setIdIfMissing: jest.fn()
	};
}

function buildUserBadge(id: string, badgeCode: string, earnedAt = new Date('2026-09-25T09:00:00.000Z')): UserBadgeEntity {
	return {
		id,
		userId: 'user-1',
		badgeCode,
		earnedAt,
		setIdIfMissing: jest.fn()
	};
}
