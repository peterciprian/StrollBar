import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmitStageAnswerDto } from './dto/submit-stage-answer.dto';
import { UnlockStrollDto } from './dto/unlock-stroll.dto';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AdventureEntity, AdventureProgressStatus } from './entities/adventure.entity';
import { StageAttemptEntity } from './entities/stage-attempt.entity';

@Injectable()
export class AdventuresService {
  constructor(
    @InjectRepository(AdventureEntity)
    private readonly adventuresRepository: Repository<AdventureEntity>,
    @InjectRepository(StageAttemptEntity)
    private readonly stageAttemptsRepository: Repository<StageAttemptEntity>,
    @InjectRepository(StrollEntity)
    private readonly strollsRepository: Repository<StrollEntity>,
    @InjectRepository(StageEntity)
    private readonly stagesRepository: Repository<StageEntity>,
  ) {}

  async unlock(dto: UnlockStrollDto, currentUserId: string) {
    const stroll = await this.strollsRepository.findOne({ where: { id: dto.strollId } });

    if (!stroll) {
      throw new NotFoundException(`Stroll ${dto.strollId} was not found.`);
    }

    const adventure = this.adventuresRepository.create({
      ownerUserId: currentUserId,
      strollId: dto.strollId,
      purchaseTime: new Date(),
      startDateTime: null,
      completionDateTime: null,
      progressStatus: AdventureProgressStatus.PURCHASED,
      currentStageIndex: 1,
    });

    return this.adventuresRepository.save(adventure);
  }

  async start(adventureId: string, currentUserId: string) {
    const adventure = await this.getAdventureOrThrow(adventureId, currentUserId);

    adventure.progressStatus = AdventureProgressStatus.IN_PROGRESS;
    adventure.startDateTime ??= new Date();

    return this.adventuresRepository.save(adventure);
  }

  async get(adventureId: string, currentUserId: string) {
    const adventure = await this.getAdventureOrThrow(adventureId, currentUserId);
    const stroll = await this.strollsRepository.findOne({ where: { id: adventure.strollId } });
    const currentStage = await this.stagesRepository.findOne({
      where: {
        strollId: adventure.strollId,
        orderIndex: adventure.currentStageIndex,
      },
    });

    return {
      adventure,
      stroll,
      currentStage,
    };
  }

  async submitAnswer(adventureId: string, stageId: string, dto: SubmitStageAnswerDto, currentUserId: string) {
    const adventure = await this.getAdventureOrThrow(adventureId, currentUserId);
    const stage = await this.stagesRepository.findOne({
      where: {
        id: stageId,
        strollId: adventure.strollId,
      },
    });

    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} was not found for this adventure.`);
    }

    const normalizedAnswer = dto.answer.trim().toLowerCase();
    const expectedAnswer = stage.riddleAnswer?.trim().toLowerCase();
    const isCorrect = !expectedAnswer || normalizedAnswer === expectedAnswer;

    await this.stageAttemptsRepository.save(
      this.stageAttemptsRepository.create({
        adventureId,
        stageId,
        providedAnswer: dto.answer,
        isCorrect,
      }),
    );

    if (isCorrect) {
      const stageCount = await this.stagesRepository.count({ where: { strollId: adventure.strollId } });

      if (adventure.currentStageIndex >= stageCount) {
        adventure.progressStatus = AdventureProgressStatus.COMPLETED;
        adventure.completionDateTime = new Date();
      } else {
        adventure.progressStatus = AdventureProgressStatus.IN_PROGRESS;
        adventure.currentStageIndex += 1;
      }

      await this.adventuresRepository.save(adventure);
    }

    return {
      isCorrect,
      adventure,
      stageId,
    };
  }

  private async getAdventureOrThrow(adventureId: string, currentUserId: string): Promise<AdventureEntity> {
    const adventure = await this.adventuresRepository.findOne({ where: { id: adventureId } });

    if (!adventure) {
      throw new NotFoundException(`Adventure ${adventureId} was not found.`);
    }

    if (adventure.ownerUserId !== currentUserId) {
      throw new ForbiddenException('You are not allowed to access this adventure.');
    }

    return adventure;
  }
}
