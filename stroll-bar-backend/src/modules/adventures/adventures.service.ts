import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { EntityManager, In, Repository } from 'typeorm';
import { AssignAdventureDto } from './dto/assign-adventure.dto';
import { NavigateAdventureDto } from './dto/navigate-adventure.dto';
import { SubmitStageAnswerDto } from './dto/submit-stage-answer.dto';
import { UnlockStrollDto } from './dto/unlock-stroll.dto';
import { AdventureResultsService } from '../achievements/adventure-results.service';
import { EmailService } from '../email/email.service';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdventureEntity, AdventureProgressStatus } from './entities/adventure.entity';
import { StageAttemptEntity } from './entities/stage-attempt.entity';
import { BadgesService } from '../badges/badges.service';
import { STROLL_PURCHASE_QUOTAS, resolveQuota } from '../../common/utils/user-quotas';
import { AppErrorCode } from '../../common/utils/app-error-code';
import { stripRiddleAnswer } from '../../common/utils/stage-sanitizer.util';

// Completion or abandonment does not revoke a purchase's content entitlement.
export const ACTIVE_ADVENTURE_STATUSES: readonly AdventureProgressStatus[] = [
	AdventureProgressStatus.PURCHASED,
	AdventureProgressStatus.IN_PROGRESS,
	AdventureProgressStatus.COMPLETED,
	AdventureProgressStatus.ABANDONED
];

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
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>,
		private readonly adventureResultsService: AdventureResultsService,
		private readonly badgesService: BadgesService,
		private readonly emailService: EmailService
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

		await this.assertCanPurchase(currentUser, stroll.publicityFlag);

		const adventure = this.adventuresRepository.create({
			ownerUserId: currentUser.userId,
			strollId: dto.strollId,
			purchaseTime: new Date(),
			startDateTime: null,
			completionDateTime: null,
			progressStatus: AdventureProgressStatus.PURCHASED,
			currentStageIndex: 1
		});

		const savedAdventure = await this.adventuresRepository.save(adventure);
		await this.badgesService.evaluateAndAward(currentUser.userId).catch(() => undefined);
		await this.notifyAuthorOfPurchase(stroll, currentUser).catch(() => undefined);
		return savedAdventure;
	}

	private async assertCanPurchase(currentUser: AuthenticatedUser, publicityFlag: StrollPublicityFlag): Promise<void> {
		const quota = resolveQuota(STROLL_PURCHASE_QUOTAS, currentUser.role);
		const isPublic = publicityFlag === StrollPublicityFlag.PUBLIC;
		const limit = isPublic ? quota.public : quota.private;

		if (limit === Number.POSITIVE_INFINITY) {
			return;
		}

		const purchasedCount = await this.adventuresRepository
			.createQueryBuilder('adventure')
			.innerJoin(StrollEntity, 'stroll', 'stroll.id = adventure.strollId')
			.where('adventure.ownerUserId = :userId', { userId: currentUser.userId })
			.andWhere('adventure.progressStatus != :revoked', { revoked: AdventureProgressStatus.REVOKED })
			.andWhere(isPublic ? 'stroll.publicityFlag = :publicFlag' : 'stroll.publicityFlag != :publicFlag', {
				publicFlag: StrollPublicityFlag.PUBLIC
			})
			.getCount();

		if (purchasedCount >= limit) {
			throw new ForbiddenException({
				code: AppErrorCode.PURCHASE_QUOTA_REACHED,
				message: `Your account type can unlock up to ${limit} ${isPublic ? 'public' : 'private'} strolls.`
			});
		}
	}

	private async notifyAuthorOfPurchase(stroll: StrollEntity, buyer: AuthenticatedUser): Promise<void> {
		if (stroll.authorId === buyer.userId) {
			return;
		}

		const author = await this.usersRepository.findOne({ where: { id: stroll.authorId } });
		if (!author) {
			return;
		}

		await this.emailService.sendStrollPurchasedEmail(author.email, author.username, stroll.name, author.preferredLanguage);
	}

	async list(currentUser: AuthenticatedUser) {
		const adventures = await this.adventuresRepository.find({
			where: currentUser.role === UserRole.ADMIN ? {} : {
				ownerUserId: currentUser.userId,
				progressStatus: In(ACTIVE_ADVENTURE_STATUSES)
			},
			order: { updatedAt: 'DESC' }
		});

		if (!adventures.length) {
			return [];
		}

		const strollIds = [...new Set(adventures.map((adventure) => adventure.strollId))];
		const [strolls, stages] = await Promise.all([
			this.strollsRepository.find({ where: { id: In(strollIds) } }),
			this.stagesRepository.find({ where: { strollId: In(strollIds) }, order: { orderIndex: 'ASC' } })
		]);
		const strollsById = new Map(strolls.map((stroll) => [stroll.id, stroll]));
		const stagesByStroll = new Map<string, StageEntity[]>();
		for (const stage of stages) {
			const bucket = stagesByStroll.get(stage.strollId) ?? [];
			bucket.push(stage);
			stagesByStroll.set(stage.strollId, bucket);
		}

		const isAdmin = currentUser.role === UserRole.ADMIN;
		return adventures.map((adventure) => {
			const currentStage = stagesByStroll.get(adventure.strollId)?.[adventure.currentStageIndex - 1] ?? null;
			return {
				adventure,
				stroll: strollsById.get(adventure.strollId) ?? null,
				// currentStageIndex is a 1-based ordinal position, not the raw orderIndex column value.
				currentStage: currentStage ? (isAdmin ? currentStage : stripRiddleAnswer(currentStage)) : null
			};
		});
	}

	async start(adventureId: string, currentUser: AuthenticatedUser) {
		return this.withLockedAdventure(adventureId, currentUser, async (adventure, manager) => {
			adventure.progressStatus = AdventureProgressStatus.IN_PROGRESS;
			adventure.startDateTime ??= new Date();
			return manager.getRepository(AdventureEntity).save(adventure);
		});
	}

	async get(adventureId: string, currentUser: AuthenticatedUser) {
		const adventure = await this.getAdventureOrThrow(adventureId, currentUser);
		const { stroll, currentStage } = await this.getStrollAndCurrentStage(
			adventure.strollId,
			adventure.currentStageIndex,
			currentUser.role === UserRole.ADMIN
		);

		return {
			adventure,
			stroll,
			currentStage
		};
	}

	async getResult(adventureId: string, currentUser: AuthenticatedUser) {
		const result = await this.withLockedAdventure(adventureId, currentUser, async (adventure, manager) => {
			const [stroll, stages] = await Promise.all([
				manager.getRepository(StrollEntity).findOne({ where: { id: adventure.strollId } }),
				manager.getRepository(StageEntity).find({ where: { strollId: adventure.strollId }, order: { orderIndex: 'ASC' } })
			]);

			// Support reads of revoked records must not complete them via the "Finish" shortcut.
			if (
				ACTIVE_ADVENTURE_STATUSES.includes(adventure.progressStatus) &&
				adventure.progressStatus !== AdventureProgressStatus.COMPLETED &&
				adventure.currentStageIndex >= stages.length
			) {
				adventure.progressStatus = AdventureProgressStatus.COMPLETED;
				adventure.completionDateTime ??= new Date();
				await manager.getRepository(AdventureEntity).save(adventure);
			}

			const completedAt = adventure.completionDateTime ?? new Date();
			const elapsedSeconds = adventure.startDateTime
				? Math.max(0, Math.round((completedAt.getTime() - adventure.startDateTime.getTime()) / 1000))
				: 0;
			const completedStageCount =
				adventure.progressStatus === AdventureProgressStatus.COMPLETED ? stages.length : Math.max(0, adventure.currentStageIndex - 1);
			const routeLengthKm = stages.slice(1).reduce((total, stage, index) => total + this.distanceInKm(stages[index], stage), 0);

			const attempts = await manager.getRepository(StageAttemptEntity).find({ where: { adventureId: adventure.id } });
			// A stage can be attempted more than once; count each riddle as correctly answered at most once.
			const correctStageIds = new Set(attempts.filter((attempt) => attempt.isCorrect).map((attempt) => attempt.stageId));
			const correctAnswerCount = correctStageIds.size;
			const totalStageCount = stages.length;

			if (adventure.progressStatus === AdventureProgressStatus.COMPLETED) {
				await this.adventureResultsService.recordCompletion({
					userId: adventure.ownerUserId,
					strollId: adventure.strollId,
					adventureId: adventure.id,
					completedStageCount,
					elapsedSeconds,
					routeLengthKm,
					completedAt
				});
			}

			return {
				adventure,
				stroll,
				completedStageCount,
				elapsedSeconds,
				routeLengthKm,
				correctAnswerCount,
				totalStageCount
			};
		}, true);

		// Badge queries use their own connection and must see committed completion state.
		if (result.adventure.progressStatus === AdventureProgressStatus.COMPLETED) {
			await this.badgesService.evaluateAndAward(result.adventure.ownerUserId).catch(() => undefined);
		}
		return result;
	}

	async submitAnswer(adventureId: string, stageId: string, dto: SubmitStageAnswerDto, currentUser: AuthenticatedUser) {
		return this.withLockedAdventure(adventureId, currentUser, async (adventure, manager) => {
			const stage = await manager.getRepository(StageEntity).findOne({
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

			const attemptsRepository = manager.getRepository(StageAttemptEntity);
			await attemptsRepository.save(
				attemptsRepository.create({
					adventureId,
					stageId,
					providedAnswer: dto.answer,
					isCorrect
				})
			);

			if (isCorrect) {
				const stageCount = await manager.getRepository(StageEntity).count({ where: { strollId: adventure.strollId } });

				if (adventure.currentStageIndex >= stageCount) {
					adventure.progressStatus = AdventureProgressStatus.COMPLETED;
					adventure.completionDateTime = new Date();
				} else {
					adventure.progressStatus = AdventureProgressStatus.IN_PROGRESS;
					adventure.currentStageIndex += 1;
				}

				await manager.getRepository(AdventureEntity).save(adventure);
			}

			return {
				isCorrect,
				adventure,
				stageId
			};
		});
	}

	async navigate(adventureId: string, dto: NavigateAdventureDto, currentUser: AuthenticatedUser) {
		return this.withLockedAdventure(adventureId, currentUser, async (adventure, manager) => {
			const stageCount = await manager.getRepository(StageEntity).count({ where: { strollId: adventure.strollId } });

			if (dto.direction === 'next') {
				adventure.currentStageIndex = Math.min(adventure.currentStageIndex + 1, Math.max(stageCount, 1));
			} else {
				adventure.currentStageIndex = Math.max(adventure.currentStageIndex - 1, 1);
			}

			if (adventure.progressStatus === AdventureProgressStatus.PURCHASED) {
				adventure.progressStatus = AdventureProgressStatus.IN_PROGRESS;
				adventure.startDateTime ??= new Date();
			}

			await manager.getRepository(AdventureEntity).save(adventure);

			const { stroll, currentStage } = await this.getStrollAndCurrentStage(
				adventure.strollId,
				adventure.currentStageIndex,
				currentUser.role === UserRole.ADMIN,
				manager
			);

			return {
				adventure,
				stroll,
				currentStage
			};
		});
	}

	private async getAdventureOrThrow(
		adventureId: string,
		currentUser: AuthenticatedUser,
		repository = this.adventuresRepository,
		lock = false
	): Promise<AdventureEntity> {
		if (!isUUID(adventureId)) {
			throw new NotFoundException(`Adventure ${adventureId} was not found.`);
		}

		const adventure = await repository.findOne({
			where: { id: adventureId },
			...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {})
		});

		if (!adventure) {
			throw new NotFoundException(`Adventure ${adventureId} was not found.`);
		}

		if (adventure.ownerUserId !== currentUser.userId && currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('You are not allowed to access this adventure.');
		}

		if (!ACTIVE_ADVENTURE_STATUSES.includes(adventure.progressStatus) && currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('This adventure has been revoked.');
		}

		return adventure;
	}

	private async withLockedAdventure<T>(
		adventureId: string,
		currentUser: AuthenticatedUser,
		operation: (adventure: AdventureEntity, manager: EntityManager) => Promise<T>,
		allowRevoked = false
	): Promise<T> {
		return this.adventuresRepository.manager.transaction(async (manager) => {
			const adventure = await this.getAdventureOrThrow(adventureId, currentUser, manager.getRepository(AdventureEntity), true);
			// Admin support access is not permission to progress a revoked adventure.
			if (!allowRevoked && !ACTIVE_ADVENTURE_STATUSES.includes(adventure.progressStatus)) {
				throw new ForbiddenException('This adventure has been revoked.');
			}
			return operation(adventure, manager);
		});
	}

	private distanceInKm(first: StageEntity, second: StageEntity): number {
		if (
			first.latitude === null ||
			first.latitude === undefined ||
			first.longitude === null ||
			first.longitude === undefined ||
			second.latitude === null ||
			second.latitude === undefined ||
			second.longitude === null ||
			second.longitude === undefined
		)
			return 0;
		const earthRadiusKm = 6371;
		const toRadians = (value: number) => (value * Math.PI) / 180;
		const latitudeDelta = toRadians(second.latitude - first.latitude);
		const longitudeDelta = toRadians(second.longitude - first.longitude);
		const firstLatitude = toRadians(first.latitude);
		const secondLatitude = toRadians(second.latitude);
		const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
		return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	/**
	 * Batch-load the stroll and its current stage to avoid repeated queries.
	 * Used by methods that need both pieces of data for a user's adventure progress.
	 */
	private async getStrollAndCurrentStage(
		strollId: string,
		stageIndex: number,
		isAdmin = false,
		manager?: EntityManager
	): Promise<{ stroll: StrollEntity | null; currentStage: StageEntity | Omit<StageEntity, 'riddleAnswer'> | null }> {
		const [stroll, stages] = await Promise.all([
			(manager?.getRepository(StrollEntity) ?? this.strollsRepository).findOne({ where: { id: strollId } }),
			(manager?.getRepository(StageEntity) ?? this.stagesRepository).find({ where: { strollId }, order: { orderIndex: 'ASC' } })
		]);

		// stageIndex is a 1-based ordinal position, not the raw orderIndex column value,
		// which may start at 0 or 1 depending on how the stroll's stages were created.
		const currentStage = stages[stageIndex - 1] ?? null;
		// Never send the riddle answer to a non-admin player; admins may inspect it (e.g. for support/moderation).
		return { stroll, currentStage: currentStage ? (isAdmin ? currentStage : stripRiddleAnswer(currentStage)) : null };
	}

	async listAllForAdmin(currentUser: AuthenticatedUser) {
		this.assertAdmin(currentUser);

		const adventures = await this.adventuresRepository.find({ order: { updatedAt: 'DESC' } });
		if (!adventures.length) {
			return [];
		}

		const strollIds = [...new Set(adventures.map((adventure) => adventure.strollId))];
		const ownerIds = [...new Set(adventures.map((adventure) => adventure.ownerUserId))];
		const [strolls, owners] = await Promise.all([
			this.strollsRepository.find({ where: { id: In(strollIds) } }),
			this.usersRepository.find({ where: { id: In(ownerIds) }, select: { id: true, username: true, email: true } })
		]);
		const strollsById = new Map(strolls.map((stroll) => [stroll.id, stroll]));
		const ownersById = new Map(owners.map((owner) => [owner.id, owner]));

		return adventures.map((adventure) => ({
			adventure,
			stroll: strollsById.get(adventure.strollId) ?? null,
			owner: ownersById.get(adventure.ownerUserId) ?? null
		}));
	}

	async assignAdventure(dto: AssignAdventureDto, currentUser: AuthenticatedUser) {
		this.assertAdmin(currentUser);

		const [stroll, targetUser] = await Promise.all([
			this.strollsRepository.findOne({ where: { id: dto.strollId } }),
			this.usersRepository.findOne({ where: { id: dto.userId } })
		]);

		if (!stroll) {
			throw new NotFoundException(`Stroll ${dto.strollId} was not found.`);
		}
		if (!targetUser) {
			throw new NotFoundException(`User ${dto.userId} was not found.`);
		}
		if (stroll.activeStatus === StrollActiveStatus.ARCHIVED) {
			throw new ForbiddenException('Archived strolls cannot be assigned.');
		}

		const existingAdventure = await this.adventuresRepository.findOne({
			where: {
				ownerUserId: dto.userId,
				strollId: dto.strollId,
				progressStatus: In([AdventureProgressStatus.PURCHASED, AdventureProgressStatus.IN_PROGRESS])
			},
			order: { updatedAt: 'DESC' }
		});

		if (existingAdventure) {
			return existingAdventure;
		}

		const adventure = this.adventuresRepository.create({
			ownerUserId: dto.userId,
			strollId: dto.strollId,
			purchaseTime: new Date(),
			startDateTime: null,
			completionDateTime: null,
			progressStatus: AdventureProgressStatus.PURCHASED,
			currentStageIndex: 1
		});

		return this.adventuresRepository.save(adventure);
	}

	async revokeAdventure(adventureId: string, currentUser: AuthenticatedUser) {
		this.assertAdmin(currentUser);

		return this.withLockedAdventure(adventureId, currentUser, async (adventure, manager) => {
			adventure.progressStatus = AdventureProgressStatus.REVOKED;
			return manager.getRepository(AdventureEntity).save(adventure);
		}, true);
	}

	private assertAdmin(currentUser: AuthenticatedUser): void {
		if (currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('Administrator access required.');
		}
	}
}
