import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStageDto } from './dto/create-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { StageEntity } from './entities/stage.entity';

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(StageEntity)
    private readonly stagesRepository: Repository<StageEntity>,
    @InjectRepository(StrollEntity)
    private readonly strollsRepository: Repository<StrollEntity>,
  ) {}

  async list(strollId: string) {
    return this.stagesRepository.find({
      where: { strollId },
      order: { orderIndex: 'ASC' },
    });
  }

  async create(strollId: string, dto: CreateStageDto, currentUserId: string) {
    const stroll = await this.getOwnedStrollOrThrow(strollId, currentUserId);

    const stage = this.stagesRepository.create({
      strollId,
      orderIndex: dto.orderIndex,
      name: dto.name,
      description: dto.description,
      notes: dto.notes ?? null,
      imageUrls: dto.imageUrls ?? [],
      videoUrls: dto.videoUrls ?? [],
      address: dto.address ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      riddleAnswer: dto.riddleAnswer?.trim().toLowerCase() ?? null,
    });

    const savedStage = await this.stagesRepository.save(stage);
    stroll.stageCount = await this.stagesRepository.count({ where: { strollId } });
    await this.strollsRepository.save(stroll);

    return savedStage;
  }

  async reorder(strollId: string, dto: ReorderStagesDto, currentUserId: string) {
    await this.getOwnedStrollOrThrow(strollId, currentUserId);
    const stages = await this.stagesRepository.find({ where: { strollId } });
    const stagesById = new Map(stages.map((stage) => [stage.id, stage]));

    for (const item of dto.items) {
      const stage = stagesById.get(item.stageId);

      if (!stage) {
        throw new NotFoundException(`Stage ${item.stageId} was not found in stroll ${strollId}.`);
      }

      stage.orderIndex = item.orderIndex;
    }

    await this.stagesRepository.save([...stagesById.values()]);

    return {
      strollId,
      reordered: dto.items.length,
    };
  }

  private async getOwnedStrollOrThrow(strollId: string, currentUserId: string): Promise<StrollEntity> {
    const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });

    if (!stroll) {
      throw new NotFoundException(`Stroll ${strollId} was not found.`);
    }

    if (stroll.authorId !== currentUserId) {
      throw new ForbiddenException('You are not allowed to modify stages in this stroll.');
    }

    return stroll;
  }
}
