import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdventureResultEntity } from '../achievements/entities/adventure-result.entity';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { BadgesService } from '../badges/badges.service';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { StrollReviewEntity } from '../strolls/entities/stroll-review.entity';

@Injectable()
export class AnalyticsService {
	private readonly logger = new Logger(AnalyticsService.name);

	constructor(
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>,
		@InjectRepository(AdventureEntity)
		private readonly adventuresRepository: Repository<AdventureEntity>,
		@InjectRepository(AdventureResultEntity)
		private readonly adventureResultsRepository: Repository<AdventureResultEntity>,
		@InjectRepository(StrollReviewEntity)
		private readonly reviewsRepository: Repository<StrollReviewEntity>,
		private readonly badgesService: BadgesService
	) {}

	async getSummary(userId: string) {
		const [
			createdStrollsCount,
			purchasedStrollsCount,
			activeStrollsCount,
			completedStrollsCount,
			shortestResult,
			avgResult,
			reviewsCount,
			badgesCount
		] = await Promise.all([
			this.strollsRepository.count({ where: { authorId: userId } }),
			this.adventuresRepository.count({ where: { ownerUserId: userId } }),
			this.adventuresRepository.count({
				where: { ownerUserId: userId, progressStatus: In([AdventureProgressStatus.PURCHASED, AdventureProgressStatus.IN_PROGRESS]) }
			}),
			this.adventuresRepository.count({ where: { ownerUserId: userId, progressStatus: AdventureProgressStatus.COMPLETED } }),
			this.adventureResultsRepository.findOne({ where: { userId }, order: { elapsedSeconds: 'ASC' } }),
			this.adventureResultsRepository
				.createQueryBuilder('result')
				.select('AVG(result.elapsedSeconds)', 'average')
				.where('result.userId = :userId', { userId })
				.getRawOne<{ average: string | null }>(),
			this.reviewsRepository.count({ where: { userId } }),
			this.badgesService.getEarnedCount(userId).catch((error) => {
				this.logger.error('Failed to compute earned badge count.', error instanceof Error ? error.stack : String(error));
				return 0;
			})
		]);

		const completionRate = purchasedStrollsCount ? Math.round((completedStrollsCount / purchasedStrollsCount) * 100) : 0;
		const avgCompletionSeconds = Math.round(Number(avgResult?.average ?? 0));

		let shortestCompletion: { strollId: string; strollName: string; elapsedSeconds: number } | null = null;
		if (shortestResult) {
			const stroll = await this.strollsRepository.findOne({ where: { id: shortestResult.strollId } });
			shortestCompletion = {
				strollId: shortestResult.strollId,
				strollName: stroll?.name ?? '—',
				elapsedSeconds: shortestResult.elapsedSeconds
			};
		}

		return {
			createdStrollsCount,
			purchasedStrollsCount,
			activeStrollsCount,
			completedStrollsCount,
			completionRate,
			shortestCompletion,
			avgCompletionSeconds,
			reviewsCount,
			badgesCount
		};
	}
}
