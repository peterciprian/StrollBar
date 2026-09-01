import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { In, Repository } from 'typeorm';
import { NavigateAdventureDto } from './dto/navigate-adventure.dto';
import { SubmitStageAnswerDto } from './dto/submit-stage-answer.dto';
import { UnlockStrollDto } from './dto/unlock-stroll.dto';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { UserRole } from '../users/entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
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
		private readonly stagesRepository: Repository<StageEntity>
	) {}

	async unlock(dto: UnlockStrollDto, currentUser: AuthenticatedUser) {
		const stroll = await this.strollsRepository.findOne({ where: { id: dto.strollId } });

		if (!stroll) {
			throw new NotFoundException(`Stroll ${dto.strollId} was not found.`);
		}

		if (
			stroll.activeStatus !== StrollActiveStatus.PUBLISHED ||
			![StrollPublicityFlag.PUBLIC, StrollPublicityFlag.PRIVATE].includes(stroll.publicityFlag)
		) {
			throw new ForbiddenException('Only published public or private strolls can be purchased.');
		}

		const existingAdventure = await this.adventuresRepository.findOne({
			where: {
				ownerUserId: currentUser.userId,
				strollId: dto.strollId,
				progressStatus: In([AdventureProgressStatus.PURCHASED, AdventureProgressStatus.IN_PROGRESS])
			},
			order: { updatedAt: 'DESC' }
		});

		if (existingAdventure) {
			return existingAdventure;
		}

		const adventure = this.adventuresRepository.create({
			ownerUserId: currentUser.userId,
			strollId: dto.strollId,
			purchaseTime: new Date(),
			startDateTime: null,
			completionDateTime: null,
			progressStatus: AdventureProgressStatus.PURCHASED,
			currentStageIndex: 1
		});

		return this.adventuresRepository.save(adventure);
	}

	async list(currentUser: AuthenticatedUser) {
		const adventures = await this.adventuresRepository.find({
			where: currentUser.role === UserRole.ADMIN ? {} : { ownerUserId: currentUser.userId },
			order: { updatedAt: 'DESC' }
		});

		if (!adventures.length) {
			return [];
		}

		const strollIds = [...new Set(adventures.map((adventure) => adventure.strollId))];
		const [strolls, stages] = await Promise.all([
			this.strollsRepository.find({ where: { id: In(strollIds) } }),
			this.stagesRepository.find({ where: { strollId: In(strollIds) } })
		]);
		const strollsById = new Map(strolls.map((stroll) => [stroll.id, stroll]));
		const stagesByPosition = new Map(stages.map((stage) => [`${stage.strollId}:${stage.orderIndex}`, stage]));

		return adventures.map((adventure) => ({
			adventure,
			stroll: strollsById.get(adventure.strollId) ?? null,
			currentStage: stagesByPosition.get(`${adventure.strollId}:${adventure.currentStageIndex}`) ?? null
		}));
	}

	async start(adventureId: string, currentUser: AuthenticatedUser) {
		const adventure = await this.getAdventureOrThrow(adventureId, currentUser);

		adventure.progressStatus = AdventureProgressStatus.IN_PROGRESS;
		adventure.startDateTime ??= new Date();

		return this.adventuresRepository.save(adventure);
	}

	async get(adventureId: string, currentUser: AuthenticatedUser) {
		const adventure = await this.getAdventureOrThrow(adventureId, currentUser);
		const stroll = await this.strollsRepository.findOne({ where: { id: adventure.strollId } });
		const currentStage = await this.stagesRepository.findOne({
			where: {
				strollId: adventure.strollId,
				orderIndex: adventure.currentStageIndex
			}
		});

		return {
			adventure,
			stroll,
			currentStage
		};
	}

	async submitAnswer(adventureId: string, stageId: string, dto: SubmitStageAnswerDto, currentUser: AuthenticatedUser) {
		const adventure = await this.getAdventureOrThrow(adventureId, currentUser);
		const stage = await this.stagesRepository.findOne({
			where: {
				id: stageId,
				strollId: adventure.strollId
			}
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
				isCorrect
			})
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
			stageId
		};
	}

	async navigate(adventureId: string, dto: NavigateAdventureDto, currentUser: AuthenticatedUser) {
		const adventure = await this.getAdventureOrThrow(adventureId, currentUser);
		const stageCount = await this.stagesRepository.count({ where: { strollId: adventure.strollId } });

		if (dto.direction === 'next') {
			adventure.currentStageIndex = Math.min(adventure.currentStageIndex + 1, Math.max(stageCount, 1));
		} else {
			adventure.currentStageIndex = Math.max(adventure.currentStageIndex - 1, 1);
		}

		if (adventure.progressStatus === AdventureProgressStatus.PURCHASED) {
			adventure.progressStatus = AdventureProgressStatus.IN_PROGRESS;
			adventure.startDateTime ??= new Date();
		}

		await this.adventuresRepository.save(adventure);

		const stroll = await this.strollsRepository.findOne({ where: { id: adventure.strollId } });
		const currentStage = await this.stagesRepository.findOne({
			where: {
				strollId: adventure.strollId,
				orderIndex: adventure.currentStageIndex
			}
		});

		return {
			adventure,
			stroll,
			currentStage
		};
	}

	private async getAdventureOrThrow(adventureId: string, currentUser: AuthenticatedUser): Promise<AdventureEntity> {
		if (!isUUID(adventureId)) {
			throw new NotFoundException(`Adventure ${adventureId} was not found.`);
		}

		const adventure = await this.adventuresRepository.findOne({ where: { id: adventureId } });

		if (!adventure) {
			throw new NotFoundException(`Adventure ${adventureId} was not found.`);
		}

		if (adventure.ownerUserId !== currentUser.userId && currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('You are not allowed to access this adventure.');
		}

		return adventure;
	}
}
