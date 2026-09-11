import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdventureResultEntity } from '../achievements/entities/adventure-result.entity';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { StageAttemptEntity } from '../adventures/entities/stage-attempt.entity';
import { StrollActiveStatus, StrollEntity } from '../strolls/entities/stroll.entity';
import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { StrollReviewEntity } from '../strolls/entities/stroll-review.entity';
import { BADGE_CATALOG, BadgeStats } from './badge-definitions';
import { UserBadgeEntity } from './entities/user-badge.entity';

@Injectable()
export class BadgesService {
	private readonly logger = new Logger(BadgesService.name);

	constructor(
		@InjectRepository(UserBadgeEntity)
		private readonly userBadgesRepository: Repository<UserBadgeEntity>,
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

	async getCatalogForUser(userId: string) {
		await this.evaluateAndAward(userId);

		const earnedByCode = await this.loadEarnedByCode(userId);

		return BADGE_CATALOG.map((definition) => ({
			code: definition.code,
			icon: definition.icon,
			title: definition.title,
			description: definition.description,
			earned: earnedByCode.has(definition.code),
			earnedAt: earnedByCode.get(definition.code) ?? null
		})).sort((left, right) => {
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

	private async loadEarnedByCode(userId: string): Promise<Map<string, Date>> {
		try {
			const earned = await this.userBadgesRepository.find({ where: { userId } });
			return new Map(earned.map((badge) => [badge.badgeCode, badge.earnedAt]));
		} catch (error) {
			this.logger.error('Failed to load earned badges.', error instanceof Error ? error.stack : String(error));
			return new Map();
		}
	}

	// Never throws: badge evaluation is a side effect and must not break the calling flow.
	async evaluateAndAward(userId: string): Promise<UserBadgeEntity[]> {
		try {
			const existing = await this.userBadgesRepository.find({ where: { userId } });
			const earnedCodes = new Set(existing.map((badge) => badge.badgeCode));
			const stats = await this.computeStats(userId);
			const newlyAwarded: UserBadgeEntity[] = [];

			for (const definition of BADGE_CATALOG) {
				if (!definition.criteria || earnedCodes.has(definition.code)) continue;
				if (definition.criteria(stats)) {
					newlyAwarded.push(await this.award(userId, definition.code));
					earnedCodes.add(definition.code);
				}
			}

			// Meta badges depend on the total badge count, so they must be evaluated last.
			for (const definition of BADGE_CATALOG) {
				if (definition.minimumBadgeCount === undefined || earnedCodes.has(definition.code)) continue;
				if (earnedCodes.size >= definition.minimumBadgeCount) {
					newlyAwarded.push(await this.award(userId, definition.code));
					earnedCodes.add(definition.code);
				}
			}

			return newlyAwarded;
		} catch (error) {
			this.logger.error('Badge evaluation failed.', error instanceof Error ? error.stack : String(error));
			return [];
		}
	}

	private async award(userId: string, badgeCode: string): Promise<UserBadgeEntity> {
		const badge = this.userBadgesRepository.create({ userId, badgeCode });
		return this.userBadgesRepository.save(badge);
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
			nightOwlCompletions,
			earlyBirdCompletions,
			weekendCompletions,
			maxCompletionsInSingleDay,
			completedCategories
		};
	}
}
