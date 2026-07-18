import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateStrollDto } from './dto/create-stroll.dto';
import { ListStrollsQueryDto } from './dto/list-strolls-query.dto';
import { UpdateStrollDto } from './dto/update-stroll.dto';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class StrollsService {
  constructor(
    @InjectRepository(StrollEntity)
    private readonly strollsRepository: Repository<StrollEntity>,
    @InjectRepository(StageEntity)
    private readonly stagesRepository: Repository<StageEntity>,
  ) {}

  async list(query: ListStrollsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = {
      publicityFlag: StrollPublicityFlag.PUBLIC,
      activeStatus: StrollActiveStatus.PUBLISHED,
    };

    if (query.search) {
      where.name = ILike(`%${query.search}%`);
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.labels) {
      where.labels = ILike(`%${query.labels.toLowerCase()}%`);
    }

    const [items, total] = await this.strollsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      page,
      limit,
      total,
    };
  }

  async create(dto: CreateStrollDto, authorId: string) {
    const stroll = this.strollsRepository.create({
      name: dto.name,
      authorId,
      activeStatus: dto.activeStatus ?? StrollActiveStatus.DRAFT,
      labels: (dto.labels ?? []).map((label) => label.trim().toLowerCase()),
      description: dto.description,
      proposerText: dto.proposerText ?? null,
      mediaUrls: {
        imageUrls: dto.imageUrls ?? [],
        videoUrls: dto.videoUrls ?? [],
      },
      publicityFlag: dto.publicityFlag ?? StrollPublicityFlag.PRIVATE,
      stageCount: 0,
    });

    return this.strollsRepository.save(stroll);
  }

  async findOne(strollId: string) {
    const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });

    if (!stroll) {
      throw new NotFoundException(`Stroll ${strollId} was not found.`);
    }

    const stages = await this.stagesRepository.find({
      where: { strollId },
      order: { orderIndex: 'ASC' },
    });

    return {
      stroll,
      stages,
    };
  }

  async update(strollId: string, dto: UpdateStrollDto, currentUserId: string) {
    const stroll = await this.getOwnedStrollOrThrow(strollId, currentUserId);

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
        videoUrls: dto.videoUrls ?? currentMedia.videoUrls ?? [],
      };
    }

    return this.strollsRepository.save(stroll);
  }

  async remove(strollId: string, currentUserId: string) {
    await this.getOwnedStrollOrThrow(strollId, currentUserId);

    await this.stagesRepository.delete({ strollId });
    await this.strollsRepository.delete({ id: strollId });

    return { id: strollId, deleted: true };
  }

  private async getOwnedStrollOrThrow(strollId: string, currentUserId: string): Promise<StrollEntity> {
    const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });

    if (!stroll) {
      throw new NotFoundException(`Stroll ${strollId} was not found.`);
    }

    if (stroll.authorId !== currentUserId) {
      throw new ForbiddenException('You are not allowed to modify this stroll.');
    }

    return stroll;
  }
}
