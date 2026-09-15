import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdventureResultEntity } from '../achievements/entities/adventure-result.entity';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { StageAttemptEntity } from '../adventures/entities/stage-attempt.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StrollActiveStatus, StrollEntity } from '../strolls/entities/stroll.entity';
import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { StrollReviewEntity } from '../strolls/entities/stroll-review.entity';
import { UserRole } from '../users/entities/user.entity';
import { BadgeStats, evaluateRules, rulesUseMetaMetric } from './badge-rules';
import { CreateBadgeDefinitionDto } from './dto/create-badge-definition.dto';
import { UpdateBadgeDefinitionDto } from './dto/update-badge-definition.dto';
import { BadgeDefinitionEntity } from './entities/badge-definition.entity';
import { UserBadgeEntity } from './entities/user-badge.entity';

@Injectable()
export class BadgesService {
	private readonly logger = new Logger(BadgesService.name);

	constructor(
		@InjectRepository(UserBadgeEntity)
		private readonly userBadgesRepository: Repository<UserBadgeEntity>,
		@InjectRepository(BadgeDefinitionEntity)
		private readonly badgeDefinitionsRepository: Repository<BadgeDefinitionEntity>,
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>,
		@InjectRepository(AdventureEntity)
		private readonly adventuresRepository: Repository<AdventureEntity>,
		@InjectRepository(AdventureResultEntity)
		private readonly adventureResultsRepository: Repository<AdventureResultEntity>,
		@InjectRepository(StageAttemptEntity)
		private readonly stageAttemptsRepository: Repository<StageAttemptEntity>,
		@InjectRepository(StrollReviewEntity)
		private readonly reviewsRepository: Repository<StrollReviewEntity>
	) {}

	// ─── User-facing ────────────────────────────────────────────────────────────

	async getCatalogForUser(userId: string) {
		await this.evaluateAndAward(userId);

		const [definitions, earnedByCode] = await Promise.all([
			this.badgeDefinitionsRepository.find({ where: { active: true } }),
			this.loadEarnedByCode(userId)
		]);

		return definitions
			.map((definition) => ({
				code: definition.code,
				icon: definition.icon,
				title: definition.title,
				description: definition.description,
				earned: earnedByCode.has(definition.code),
				earnedAt: earnedByCode.get(definition.code) ?? null
			}))
			.sort((left, right) => {
				if (left.earned !== right.earned) return left.earned ? -1 : 1;
				if (left.earnedAt && right.earnedAt) return new Date(right.earnedAt).getTime() - new Date(left.earnedAt).getTime();
				return 0;
			});
	}

	async getEarnedCount(userId: string): Promise<number> {
		await this.evaluateAndAward(userId);
		try {
			return await this.userBadgesRepository.count({ where: { userId } });
		} catch (error) {
			this.logger.error('Failed to count earned badges.', error instanceof Error ? error.stack : String(error));
			return 0;
		}
	}

	// Re-evaluates every active badge definition against the user's live stats: awards newly
	// qualifying badges and revokes ones the user no longer qualifies for (e.g. after an admin
	// tightens a rule). Never throws: this is always a side effect of some other action.
	async evaluateAndAward(userId: string): Promise<{ awarded: string[]; revoked: string[] }> {
		try {
			const [definitions, existing] = await Promise.all([
				this.badgeDefinitionsRepository.find({ where: { active: true } }),
				this.userBadgesRepository.find({ where: { userId } })
			]);

			const activeCodes = new Set(definitions.map((definition) => definition.code));
			const staleBadgeIds = existing.filter((badge) => !activeCodes.has(badge.badgeCode)).map((badge) => badge.id);
			if (staleBadgeIds.length) {
				await this.userBadgesRepository.delete({ id: In(staleBadgeIds) });
			}

			const earnedCodes = new Set(existing.filter((badge) => activeCodes.has(badge.badgeCode)).map((badge) => badge.badgeCode));
			const stats = await this.computeStats(userId);
			const awarded: string[] = [];
			const revoked: string[] = [];

			const statDefinitions = definitions.filter((definition) => !rulesUseMetaMetric(definition.rules));
			const metaDefinitions = definitions.filter((definition) => rulesUseMetaMetric(definition.rules));

			for (const definition of statDefinitions) {
				const passes = evaluateRules(definition.rules, stats);
				const isEarned = earnedCodes.has(definition.code);
				if (passes && !isEarned) {
					await this.award(userId, definition.code);
					earnedCodes.add(definition.code);
					awarded.push(definition.code);
				} else if (!passes && isEarned) {
					await this.revoke(userId, definition.code);
					earnedCodes.delete(definition.code);
					revoked.push(definition.code);
				}
			}

			const statsWithMeta: BadgeStats = { ...stats, totalBadgesEarned: earnedCodes.size };
			for (const definition of metaDefinitions) {
				const passes = evaluateRules(definition.rules, statsWithMeta);
				const isEarned = earnedCodes.has(definition.code);
				if (passes && !isEarned) {
					await this.award(userId, definition.code);
					earnedCodes.add(definition.code);
					awarded.push(definition.code);
				} else if (!passes && isEarned) {
					await this.revoke(userId, definition.code);
					earnedCodes.delete(definition.code);
					revoked.push(definition.code);
				}
			}

			return { awarded, revoked };
		} catch (error) {
			this.logger.error('Badge evaluation failed.', error instanceof Error ? error.stack : String(error));
			return { awarded: [], revoked: [] };
		}
	}

	// ─── Admin CRUD ─────────────────────────────────────────────────────────────

	async listDefinitionsForAdmin(currentUser: AuthenticatedUser): Promise<BadgeDefinitionEntity[]> {
		this.assertAdmin(currentUser);
		return this.badgeDefinitionsRepository.find({ order: { createdAt: 'ASC' } });
	}

	async createDefinition(dto: CreateBadgeDefinitionDto, currentUser: AuthenticatedUser): Promise<BadgeDefinitionEntity> {
		this.assertAdmin(currentUser);

		const existing = await this.badgeDefinitionsRepository.findOne({ where: { code: dto.code } });
		if (existing) {
			throw new ForbiddenException(`A badge with code ${dto.code} already exists.`);
		}

		const definition = this.badgeDefinitionsRepository.create({
			code: dto.code,
			icon: dto.icon,
			title: dto.title,
			description: dto.description,
			active: dto.active ?? true,
			rules: dto.rules
		});
		return this.badgeDefinitionsRepository.save(definition);
	}

	async updateDefinition(id: string, dto: UpdateBadgeDefinitionDto, currentUser: AuthenticatedUser): Promise<BadgeDefinitionEntity> {
		this.assertAdmin(currentUser);

		const definition = await this.badgeDefinitionsRepository.findOne({ where: { id } });
		if (!definition) {
			throw new NotFoundException(`Badge definition ${id} was not found.`);
		}

		if (dto.icon !== undefined) definition.icon = dto.icon;
		if (dto.title !== undefined) definition.title = dto.title;
		if (dto.description !== undefined) definition.description = dto.description;
		if (dto.active !== undefined) definition.active = dto.active;
		if (dto.rules !== undefined) definition.rules = dto.rules;

		// Changing rules (or deactivating) can change who qualifies; re-evaluation happens
		// lazily per-user on their next badge read or gameplay action.
		return this.badgeDefinitionsRepository.save(definition);
	}

	async deleteDefinition(id: string, currentUser: AuthenticatedUser): Promise<{ id: string; deleted: boolean }> {
		this.assertAdmin(currentUser);

		const definition = await this.badgeDefinitionsRepository.findOne({ where: { id } });
		if (!definition) {
			throw new NotFoundException(`Badge definition ${id} was not found.`);
		}

		await this.badgeDefinitionsRepository.delete({ id });
		await this.userBadgesRepository.delete({ badgeCode: definition.code });

		return { id, deleted: true };
	}

	// ─── Internals ──────────────────────────────────────────────────────────────

	private assertAdmin(currentUser: AuthenticatedUser): void {
		if (currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('Administrator access required.');
		}
	}

	private async award(userId: string, badgeCode: string): Promise<void> {
		const badge = this.userBadgesRepository.create({ userId, badgeCode });
		await this.userBadgesRepository.save(badge);
	}

	private async revoke(userId: string, badgeCode: string): Promise<void> {
		await this.userBadgesRepository.delete({ userId, badgeCode });
	}

	private async loadEarnedByCode(userId: string): Promise<Map<string, Date>> {
		try {
			const earned = await this.userBadgesRepository.find({ where: { userId } });
			return new Map(earned.map((badge) => [badge.badgeCode, badge.earnedAt]));
		} catch (error) {
			this.logger.error('Failed to load earned badges.', error instanceof Error ? error.stack : String(error));
			return new Map();
		}
	}

	private async computeStats(userId: string): Promise<BadgeStats> {
		const [createdStrollsCount, publishedStrollsCount, purchasedStrollsCount, activeStrollsCount, completedStrollsCount, reviewsCount] =
			await Promise.all([
				this.strollsRepository.count({ where: { authorId: userId } }),
				this.strollsRepository.count({ where: { authorId: userId, activeStatus: StrollActiveStatus.PUBLISHED } }),
				this.adventuresRepository.count({ where: { ownerUserId: userId } }),
				this.adventuresRepository.count({
					where: { ownerUserId: userId, progressStatus: In([AdventureProgressStatus.PURCHASED, AdventureProgressStatus.IN_PROGRESS]) }
				}),
				this.adventuresRepository.count({ where: { ownerUserId: userId, progressStatus: AdventureProgressStatus.COMPLETED } }),
				this.reviewsRepository.count({ where: { userId } })
			]);

		const completionRate = purchasedStrollsCount ? Math.round((completedStrollsCount / purchasedStrollsCount) * 100) : 0;
		const results = await this.adventureResultsRepository.find({ where: { userId } });

		let shortestCompletionSeconds: number | null = null;
		let totalDistanceKm = 0;
		let nightOwlCompletions = 0;
		let earlyBirdCompletions = 0;
		let weekendCompletions = 0;
		const completionsByDay = new Map<string, number>();

		for (const result of results) {
			if (shortestCompletionSeconds === null || result.elapsedSeconds < shortestCompletionSeconds) {
				shortestCompletionSeconds = result.elapsedSeconds;
			}
			totalDistanceKm += result.routeLengthKm;

			const hour = result.completedAt.getUTCHours();
			if (hour >= 22 || hour < 5) nightOwlCompletions += 1;
			if (hour < 7) earlyBirdCompletions += 1;

			const dayOfWeek = result.completedAt.getUTCDay();
			if (dayOfWeek === 0 || dayOfWeek === 6) weekendCompletions += 1;

			const dayKey = result.completedAt.toISOString().slice(0, 10);
			completionsByDay.set(dayKey, (completionsByDay.get(dayKey) ?? 0) + 1);
		}

		const maxCompletionsInSingleDay = completionsByDay.size ? Math.max(...completionsByDay.values()) : 0;

		const strollIds = [...new Set(results.map((result) => result.strollId))];
		const strolls = strollIds.length ? await this.strollsRepository.find({ where: { id: In(strollIds) } }) : [];
		const categoryByStroll = new Map(strolls.map((stroll) => [stroll.id, stroll.category]));
		const completedCategories = new Set<StrollCategory>();
		for (const result of results) {
			const category = categoryByStroll.get(result.strollId);
			if (category) completedCategories.add(category);
		}

		const adventureIds = results.map((result) => result.adventureId);
		let flawlessCompletions = 0;
		if (adventureIds.length) {
			const incorrectRows = await this.stageAttemptsRepository
				.createQueryBuilder('attempt')
				.select('attempt.adventureId', 'adventureId')
				.where('attempt.adventureId IN (:...adventureIds)', { adventureIds })
				.andWhere('attempt.isCorrect = false')
				.groupBy('attempt.adventureId')
				.getRawMany<{ adventureId: string }>();
			const adventuresWithMistakes = new Set(incorrectRows.map((row) => row.adventureId));
			flawlessCompletions = adventureIds.filter((id) => !adventuresWithMistakes.has(id)).length;
		}

		const correctAttemptRows = await this.stageAttemptsRepository
			.createQueryBuilder('attempt')
			.innerJoin(AdventureEntity, 'adventure', 'adventure.id = attempt.adventureId')
			.select('attempt.adventureId', 'adventureId')
			.addSelect('attempt.stageId', 'stageId')
			.where('adventure.ownerUserId = :userId', { userId })
			.andWhere('attempt.isCorrect = :isCorrect', { isCorrect: true })
			.getRawMany<{ adventureId: string; stageId: string }>();
		// A stage can be attempted more than once before it's answered correctly; count each riddle once.
		const correctRiddleAnswersCount = new Set(correctAttemptRows.map((row) => `${row.adventureId}:${row.stageId}`)).size;

		return {
			createdStrollsCount,
			publishedStrollsCount,
			purchasedStrollsCount,
			activeStrollsCount,
			completedStrollsCount,
			completionRate,
			reviewsCount,
			shortestCompletionSeconds,
			totalDistanceKm,
			flawlessCompletions,
			correctRiddleAnswersCount,
			nightOwlCompletions,
			earlyBirdCompletions,
			weekendCompletions,
			maxCompletionsInSingleDay,
			distinctCategoriesCompleted: completedCategories.size,
			completedCategories,
			totalBadgesEarned: 0
		};
	}
}
