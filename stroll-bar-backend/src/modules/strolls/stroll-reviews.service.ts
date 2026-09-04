import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateStrollReviewDto } from './dto/create-stroll-review.dto';
import { StrollReviewEntity } from './entities/stroll-review.entity';
import { StrollEntity } from './entities/stroll.entity';
import { RedisCacheService } from '../../common/services/redis-cache.service';

const ANONYMOUS_REVIEWER_NAME = 'Stroller';

@Injectable()
export class StrollReviewsService {
	constructor(
		@InjectRepository(StrollReviewEntity)
		private readonly reviewsRepository: Repository<StrollReviewEntity>,
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>,
		@InjectRepository(AdventureEntity)
		private readonly adventuresRepository: Repository<AdventureEntity>,
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>,
		private readonly cache: RedisCacheService
	) {}

	async list(strollId: string) {
		const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });
		if (!stroll) throw new NotFoundException('Stroll not found');

		const reviews = await this.reviewsRepository.find({ where: { strollId }, order: { createdAt: 'DESC' } });
		const authorNames = await this.loadAuthorNames(reviews);

		return {
			items: reviews.map((review) => this.toResponse(review, authorNames)),
			ratingAverage: stroll.ratingAverage,
			ratingCount: stroll.ratingCount
		};
	}

	async findMine(strollId: string, userId: string) {
		const review = await this.reviewsRepository.findOne({ where: { strollId, userId } });
		return review ? this.toResponse(review, await this.loadAuthorNames([review])) : null;
	}

	async submit(strollId: string, userId: string, dto: CreateStrollReviewDto) {
		const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });
		if (!stroll) throw new NotFoundException('Stroll not found');

		const completedAdventure = await this.adventuresRepository.findOne({
			where: { strollId, ownerUserId: userId, progressStatus: AdventureProgressStatus.COMPLETED },
			order: { completionDateTime: 'DESC' }
		});
		if (!completedAdventure) throw new ForbiddenException('Only travellers who completed this stroll can review it');

		const existing = await this.reviewsRepository.findOne({ where: { strollId, userId } });
		const review = await this.reviewsRepository.save({
			...(existing ?? {}),
			strollId,
			userId,
			adventureId: completedAdventure.id,
			rating: dto.rating,
			comment: dto.comment?.trim() || null
		});

		await this.recalculateStrollRating(strollId);
		await this.cache.deleteByPrefix('strolls:list:');
		return this.toResponse(review, await this.loadAuthorNames([review]));
	}

	private async recalculateStrollRating(strollId: string) {
		const aggregate = await this.reviewsRepository
			.createQueryBuilder('review')
			.select('AVG(review.rating)', 'average')
			.addSelect('COUNT(review.id)', 'count')
			.where('review.strollId = :strollId', { strollId })
			.getRawOne<{ average: string | null; count: string }>();

		const ratingCount = Number(aggregate?.count ?? 0);
		const ratingAverage = ratingCount ? Math.round(Number(aggregate?.average ?? 0) * 100) / 100 : 0;
		await this.strollsRepository.update({ id: strollId }, { ratingAverage, ratingCount });
	}

	private async loadAuthorNames(reviews: StrollReviewEntity[]) {
		const userIds = [...new Set(reviews.map((review) => review.userId))];
		if (!userIds.length) return new Map<string, string>();
		const users = await this.usersRepository.find({ where: { id: In(userIds) }, select: { id: true, username: true } });
		return new Map(users.map((user) => [user.id, user.username]));
	}

	private toResponse(review: StrollReviewEntity, authorNames: Map<string, string>) {
		return {
			id: review.id,
			strollId: review.strollId,
			userId: review.userId,
			authorName: authorNames.get(review.userId) ?? ANONYMOUS_REVIEWER_NAME,
			rating: review.rating,
			comment: review.comment ?? null,
			createdAt: review.createdAt
		};
	}
}
