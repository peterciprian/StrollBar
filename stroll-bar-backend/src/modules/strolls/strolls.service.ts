import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository, SelectQueryBuilder } from 'typeorm';
import { BulkImportStrollDto } from './dto/bulk-import-stroll.dto';
import { CreateStrollDto } from './dto/create-stroll.dto';
import { ListStrollsQueryDto } from './dto/list-strolls-query.dto';
import { UpdateStrollDto } from './dto/update-stroll.dto';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';
import { StrollCategory } from './dto/stroll-category.enum';
import { UserRole } from '../users/entities/user.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { calculateRouteLengthKm } from './route-length.util';

const SIMPLE_PUBLIC_STROLL_LIMIT = 3;
const PRIVATE_STROLL_EXTRACT_LENGTH = 240;
// Sorts strolls without a first-stage coordinate to the end of the nearest-first list.
const MISSING_COORDINATE_FALLBACK = 10000;
type StrollListResponse = { items: ReturnType<StrollsService['createSummary']>[]; page: number; limit: number; total: number };

@Injectable()
export class StrollsService {
	constructor(
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>,
		@InjectRepository(StageEntity)
		private readonly stagesRepository: Repository<StageEntity>,
		@InjectRepository(AdventureEntity)
		private readonly adventuresRepository: Repository<AdventureEntity>,
		private readonly cache: RedisCacheService,
		private readonly dataSource: DataSource
	) {}

	async list(query: ListStrollsQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const cacheKey = `strolls:list:${JSON.stringify(query)}`;
		const cacheable = !query.authorId && query.sortBy !== 'nearest';
		if (cacheable) {
			const cached = await this.cache.get<StrollListResponse>(cacheKey);
			if (cached) return cached;
		}

		const builder = this.strollsRepository
			.createQueryBuilder('stroll')
			.where('stroll.activeStatus = :activeStatus', { activeStatus: StrollActiveStatus.PUBLISHED })
			.andWhere('stroll.publicityFlag IN (:...publicityFlags)', {
				publicityFlags: [StrollPublicityFlag.PUBLIC, StrollPublicityFlag.PRIVATE]
			});

		if (query.search) {
			builder.andWhere('LOWER(stroll.name) LIKE :search', { search: `${query.search.toLowerCase()}%` });
		}

		if (query.authorId) {
			builder.andWhere('stroll.authorId = :authorId', { authorId: query.authorId });
		}

		if (query.labels) {
			builder.andWhere('LOWER(stroll.labels) LIKE :labels', { labels: `${query.labels.toLowerCase()}%` });
		}

		this.applyListSorting(builder, query);

		const [items, total] = await builder
			.skip((page - 1) * limit)
			.take(limit)
			.getManyAndCount();
		const response = {
			items: items.map((stroll) => this.createSummary(stroll)),
			page,
			limit,
			total
		};
		if (cacheable) await this.cache.set(cacheKey, response, 600);
		return response;
	}

	private applyListSorting(builder: SelectQueryBuilder<StrollEntity>, query: ListStrollsQueryDto) {
		if (query.sortBy === 'top_rated') {
			builder.orderBy('stroll.ratingAverage', 'DESC').addOrderBy('stroll.ratingCount', 'DESC').addOrderBy('stroll.createdAt', 'DESC');
			return;
		}

		if (query.sortBy === 'most_popular') {
			const purchaseCount = '(SELECT COUNT(*) FROM adventures purchase WHERE purchase."strollId" = stroll.id)';
			builder.orderBy(purchaseCount, 'DESC').addOrderBy('stroll.createdAt', 'DESC');
			return;
		}

		if (query.sortBy === 'nearest' && query.userLatitude !== undefined && query.userLongitude !== undefined) {
			const firstStageColumn = (column: string) =>
				`COALESCE((SELECT stage."${column}" FROM stages stage WHERE stage."strollId" = stroll.id ORDER BY stage."orderIndex" ASC LIMIT 1), :missingCoordinate)`;
			const latitudeDelta = `(${firstStageColumn('latitude')} - :userLatitude)`;
			// Longitude degrees shrink towards the poles, so scale them by cos(latitude) before comparing squared distances.
			const longitudeDelta = `((${firstStageColumn('longitude')} - :userLongitude) * :longitudeScale)`;
			builder
				.orderBy(`${latitudeDelta} * ${latitudeDelta} + ${longitudeDelta} * ${longitudeDelta}`, 'ASC')
				.addOrderBy('stroll.createdAt', 'DESC')
				.setParameters({
					userLatitude: query.userLatitude,
					userLongitude: query.userLongitude,
					longitudeScale: Math.cos((query.userLatitude * Math.PI) / 180),
					missingCoordinate: MISSING_COORDINATE_FALLBACK
				});
			return;
		}

		builder.orderBy('stroll.createdAt', 'DESC');
	}

	async listOwned(query: ListStrollsQueryDto, authorId: string) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const where: Record<string, unknown> = { authorId };

		if (query.search) {
			where.name = ILike(`${query.search}%`);
		}

		if (query.labels) {
			where.labels = ILike(`${query.labels.toLowerCase()}%`);
		}

		const [items, total] = await this.strollsRepository.findAndCount({
			where,
			order: { createdAt: 'DESC' },
			skip: (page - 1) * limit,
			take: limit
		});

		return {
			items,
			page,
			limit,
			total
		};
	}

	async create(dto: CreateStrollDto, currentUser: AuthenticatedUser) {
		const publicityFlag = dto.publicityFlag ?? StrollPublicityFlag.PUBLIC;
		this.assertPriceAllowed(publicityFlag, dto.price);
		await this.assertCanCreateWithPublicity(currentUser, publicityFlag);
		const stroll = this.strollsRepository.create({
			name: dto.name,
			authorId: currentUser.userId,
			activeStatus: dto.activeStatus ?? StrollActiveStatus.DRAFT,
			labels: (dto.labels ?? []).map((label) => label.trim().toLowerCase()),
			category: dto.category ?? StrollCategory.ENTERTAINMENT,
			description: dto.description,
			proposerText: dto.proposerText ?? null,
			mediaUrls: {
				imageUrls: dto.imageUrls ?? [],
				videoUrls: dto.videoUrls ?? []
			},
			price: publicityFlag === StrollPublicityFlag.PRIVATE ? (dto.price ?? null) : null,
			length: 0,
			publicityFlag,
			stageCount: 0
		});

		const saved = await this.strollsRepository.save(stroll);
		await this.cache.deleteByPrefix('strolls:list:');
		return saved;
	}

	async bulkImport(dto: BulkImportStrollDto, currentUser: AuthenticatedUser) {
		if (currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('Only administrators can bulk import strolls.');
		}

		const stageOrderOffset = dto.stages.some((stage) => stage.orderIndex === 0) ? 1 : 0;
		const publicityFlag = dto.stroll.publicityFlag ?? StrollPublicityFlag.PRIVATE;
		this.assertPriceAllowed(publicityFlag, dto.stroll.price);
		const result = await this.dataSource.transaction(async (manager) => {
			const stroll = manager.create(StrollEntity, {
				name: dto.stroll.name,
				authorId: currentUser.userId,
				activeStatus: dto.stroll.activeStatus ?? StrollActiveStatus.DRAFT,
				labels: dto.stroll.labels.map((label) => label.trim().toLowerCase()),
				category: dto.stroll.category ?? StrollCategory.ENTERTAINMENT,
				description: dto.stroll.description,
				proposerText: dto.stroll.proposerText ?? null,
				mediaUrls: {
					imageUrls: dto.stroll.mediaUrls?.imageUrls ?? [],
					videoUrls: dto.stroll.mediaUrls?.videoUrls ?? []
				},
				publicityFlag,
				price: dto.stroll.price ?? null,
				stageCount: dto.stages.length
			});
			const savedStroll = await manager.save(StrollEntity, stroll);
			const stages = dto.stages.map((stage) =>
				manager.create(StageEntity, {
					strollId: savedStroll.id,
					orderIndex: stage.orderIndex + stageOrderOffset,
					name: stage.name,
					description: stage.description,
					notes: stage.notes ?? null,
					imageUrls: stage.imageUrls ?? [],
					videoUrls: stage.videoUrls ?? [],
					address: stage.address ?? null,
					latitude: stage.latitude ?? null,
					longitude: stage.longitude ?? null
				})
			);
			const savedStages = stages.length ? await manager.save(StageEntity, stages) : [];
			savedStroll.length = calculateRouteLengthKm(savedStages.slice().sort((left, right) => left.orderIndex - right.orderIndex));
			await manager.save(StrollEntity, savedStroll);
			return { stroll: savedStroll, stages: savedStages };
		});

		await this.cache.deleteByPrefix('strolls:list:');
		return result;
	}

	async findOne(strollId: string, currentUser?: AuthenticatedUser) {
		const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });

		if (!stroll) {
			throw new NotFoundException(`Stroll ${strollId} was not found.`);
		}

		await this.assertCanRead(stroll, currentUser);

		return this.getDetail(stroll);
	}

	async findOwnedOne(strollId: string, currentUser: AuthenticatedUser) {
		const stroll = await this.getOwnedStrollOrThrow(strollId, currentUser);

		return this.getDetail(stroll);
	}

	private async getDetail(stroll: StrollEntity) {
		const strollId = stroll.id;

		const stages = await this.stagesRepository.find({
			where: { strollId },
			order: { orderIndex: 'ASC' }
		});

		return {
			stroll,
			stages
		};
	}

	async update(strollId: string, dto: UpdateStrollDto, currentUser: AuthenticatedUser) {
		const stroll = await this.getOwnedStrollOrThrow(strollId, currentUser);
		const nextPublicity = dto.publicityFlag ?? stroll.publicityFlag;
		this.assertPriceAllowed(nextPublicity, dto.price);
		if (nextPublicity !== StrollPublicityFlag.PRIVATE && (dto.price !== undefined || stroll.price)) {
			stroll.price = null;
		}

		if (dto.publicityFlag !== undefined && dto.publicityFlag !== stroll.publicityFlag) {
			await this.assertCanCreateWithPublicity(currentUser, dto.publicityFlag);
		}

		if (dto.name !== undefined) {
			stroll.name = dto.name;
		}

		if (dto.description !== undefined) {
			stroll.description = dto.description;
		}

		if (dto.proposerText !== undefined) {
			stroll.proposerText = dto.proposerText;
		}

		if (dto.labels !== undefined) {
			stroll.labels = dto.labels.map((label) => label.trim().toLowerCase());
		}

		if (dto.category !== undefined) stroll.category = dto.category;

		if (dto.activeStatus !== undefined) {
			stroll.activeStatus = dto.activeStatus;
		}

		if (dto.publicityFlag !== undefined) {
			stroll.publicityFlag = dto.publicityFlag;
		}

		if (dto.price !== undefined && nextPublicity === StrollPublicityFlag.PRIVATE) stroll.price = dto.price;

		if (dto.imageUrls !== undefined || dto.videoUrls !== undefined) {
			const currentMedia = stroll.mediaUrls ?? { imageUrls: [], videoUrls: [] };
			stroll.mediaUrls = {
				imageUrls: dto.imageUrls ?? currentMedia.imageUrls ?? [],
				videoUrls: dto.videoUrls ?? currentMedia.videoUrls ?? []
			};
		}

		const saved = await this.strollsRepository.save(stroll);
		await this.cache.deleteByPrefix('strolls:list:');
		return saved;
	}

	async remove(strollId: string, currentUser: AuthenticatedUser) {
		await this.getOwnedStrollOrThrow(strollId, currentUser);

		await this.stagesRepository.delete({ strollId });
		await this.strollsRepository.delete({ id: strollId });
		await this.cache.deleteByPrefix('strolls:list:');

		return { id: strollId, deleted: true };
	}

	private async getOwnedStrollOrThrow(strollId: string, currentUser: AuthenticatedUser): Promise<StrollEntity> {
		const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });

		if (!stroll) {
			throw new NotFoundException(`Stroll ${strollId} was not found.`);
		}

		if (stroll.authorId !== currentUser.userId && currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('You are not allowed to modify this stroll.');
		}

		return stroll;
	}

	private async assertCanCreateWithPublicity(currentUser: AuthenticatedUser, publicityFlag: StrollPublicityFlag): Promise<void> {
		if (currentUser.role === UserRole.ADMIN) {
			return;
		}

		if (publicityFlag !== StrollPublicityFlag.PUBLIC) {
			if (currentUser.role !== UserRole.PREMIUM) {
				throw new ForbiddenException('Only premium users can create private or unlisted strolls.');
			}

			return;
		}

		if (currentUser.role === UserRole.CREATOR) {
			return;
		}

		const publicStrollCount = await this.strollsRepository.count({
			where: { authorId: currentUser.userId, publicityFlag: StrollPublicityFlag.PUBLIC }
		});

		if (publicStrollCount >= SIMPLE_PUBLIC_STROLL_LIMIT) {
			throw new ForbiddenException('Simple and premium users can create up to 3 public strolls.');
		}
	}

	private assertPriceAllowed(publicityFlag: StrollPublicityFlag, price?: { amount: number; currency: string } | null): void {
		if (price && publicityFlag !== StrollPublicityFlag.PRIVATE) {
			throw new ForbiddenException('Only private strolls can have a price.');
		}
	}

	private async assertCanRead(stroll: StrollEntity, currentUser?: AuthenticatedUser): Promise<void> {
		if (stroll.activeStatus === StrollActiveStatus.PUBLISHED && stroll.publicityFlag === StrollPublicityFlag.PUBLIC) {
			return;
		}

		if (currentUser && (stroll.authorId === currentUser.userId || currentUser.role === UserRole.ADMIN)) {
			return;
		}

		if (currentUser && stroll.activeStatus === StrollActiveStatus.PUBLISHED) {
			const purchase = await this.adventuresRepository.findOne({
				select: { id: true },
				where: { strollId: stroll.id, ownerUserId: currentUser.userId }
			});

			if (purchase) {
				return;
			}
		}

		throw new ForbiddenException('Purchase this stroll to view its full content.');
	}

	private createSummary(stroll: StrollEntity) {
		const description = stroll.description.trim();
		const descriptionExtract =
			description.length > PRIVATE_STROLL_EXTRACT_LENGTH ? `${description.slice(0, PRIVATE_STROLL_EXTRACT_LENGTH).trimEnd()}...` : description;
		const firstImageUrl = stroll.mediaUrls?.imageUrls?.[0];

		return {
			id: stroll.id,
			name: stroll.name,
			authorId: stroll.authorId,
			labels: stroll.labels,
			category: stroll.category,
			description: descriptionExtract,
			mediaUrls: firstImageUrl ? { imageUrls: [firstImageUrl], videoUrls: [] } : null,
			price: stroll.publicityFlag === StrollPublicityFlag.PRIVATE ? (stroll.price ?? null) : null,
			length: stroll.length,
			publicityFlag: stroll.publicityFlag,
			stageCount: stroll.stageCount,
			ratingAverage: stroll.ratingAverage ?? 0,
			ratingCount: stroll.ratingCount ?? 0
		};
	}
}
