import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { BulkImportStrollDto } from './dto/bulk-import-stroll.dto';
import { CreateStrollDto } from './dto/create-stroll.dto';
import { ListStrollsQueryDto } from './dto/list-strolls-query.dto';
import { UpdateStrollDto } from './dto/update-stroll.dto';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';
import { UserRole } from '../users/entities/user.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RedisCacheService } from '../../common/services/redis-cache.service';

const SIMPLE_PUBLIC_STROLL_LIMIT = 3;
const PRIVATE_STROLL_EXTRACT_LENGTH = 240;
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
		const filters: Record<string, unknown> = {
			activeStatus: StrollActiveStatus.PUBLISHED
		};
		const cacheKey = `strolls:list:${JSON.stringify(query)}`;
		if (!query.authorId) {
			const cached = await this.cache.get<StrollListResponse>(cacheKey);
			if (cached) return cached;
		}

		if (query.search) {
			filters.name = ILike(`${query.search}%`);
		}

		if (query.authorId) {
			filters.authorId = query.authorId;
		}

		if (query.labels) {
			filters.labels = ILike(`${query.labels.toLowerCase()}%`);
		}

		const [items, total] = await this.strollsRepository.findAndCount({
			where: [
				{ ...filters, publicityFlag: StrollPublicityFlag.PUBLIC },
				{ ...filters, publicityFlag: StrollPublicityFlag.PRIVATE }
			],
			order: { createdAt: 'DESC' },
			skip: (page - 1) * limit,
			take: limit
		});
		const response = {
			items: items.map((stroll) => this.createSummary(stroll)),
			page,
			limit,
			total
		};
		if (!query.authorId) await this.cache.set(cacheKey, response, 600);
		return response;
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
		await this.assertCanCreateWithPublicity(currentUser, publicityFlag);
		const stroll = this.strollsRepository.create({
			name: dto.name,
			authorId: currentUser.userId,
			activeStatus: dto.activeStatus ?? StrollActiveStatus.DRAFT,
			labels: (dto.labels ?? []).map((label) => label.trim().toLowerCase()),
			description: dto.description,
			proposerText: dto.proposerText ?? null,
			mediaUrls: {
				imageUrls: dto.imageUrls ?? [],
				videoUrls: dto.videoUrls ?? []
			},
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

		const result = await this.dataSource.transaction(async (manager) => {
			const stroll = manager.create(StrollEntity, {
				name: dto.stroll.name,
				authorId: currentUser.userId,
				activeStatus: dto.stroll.activeStatus ?? StrollActiveStatus.DRAFT,
				labels: dto.stroll.labels.map((label) => label.trim().toLowerCase()),
				description: dto.stroll.description,
				proposerText: dto.stroll.proposerText ?? null,
				mediaUrls: {
					imageUrls: dto.stroll.mediaUrls?.imageUrls ?? [],
					videoUrls: dto.stroll.mediaUrls?.videoUrls ?? []
				},
				publicityFlag: dto.stroll.publicityFlag ?? StrollPublicityFlag.PRIVATE,
				stageCount: dto.stages.length
			});
			const savedStroll = await manager.save(StrollEntity, stroll);
			const stages = dto.stages.map((stage) =>
				manager.create(StageEntity, {
					strollId: savedStroll.id,
					orderIndex: stage.orderIndex,
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

		if (dto.activeStatus !== undefined) {
			stroll.activeStatus = dto.activeStatus;
		}

		if (dto.publicityFlag !== undefined) {
			stroll.publicityFlag = dto.publicityFlag;
		}

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
			description: descriptionExtract,
			mediaUrls: firstImageUrl ? { imageUrls: [firstImageUrl], videoUrls: [] } : null,
			publicityFlag: stroll.publicityFlag,
			stageCount: stroll.stageCount
		};
	}
}
