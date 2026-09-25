import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppErrorCode } from '../../common/utils/app-error-code';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { AdventureEntity, AdventureProgressStatus } from './entities/adventure.entity';
import { AdventuresService } from './adventures.service';

describe('AdventuresService', () => {
	const quotaQueryBuilder: Record<string, jest.Mock> = {
		innerJoin: jest.fn(() => quotaQueryBuilder),
		where: jest.fn(() => quotaQueryBuilder),
		andWhere: jest.fn(() => quotaQueryBuilder),
		getCount: jest.fn()
	};
	let adventuresRepository: any;
	let stageAttemptsRepository: any;
	let strollsRepository: any;
	let stagesRepository: any;
	let usersRepository: any;
	let adventureResultsService: any;
	let badgesService: any;
	let emailService: any;
	let service: AdventuresService;

	const simpleUser: AuthenticatedUser = {
		userId: 'user-1',
		email: 'walker@example.com',
		username: 'walker',
		role: UserRole.SIMPLE
	};

	beforeEach(() => {
		Object.values(quotaQueryBuilder).forEach((mock) => mock.mockClear());
		quotaQueryBuilder.getCount.mockResolvedValue(0);
		adventuresRepository = {
			create: jest.fn((value) => value),
			createQueryBuilder: jest.fn(() => quotaQueryBuilder),
			find: jest.fn(),
			findOne: jest.fn(),
			save: jest.fn(async (value) => ({ id: value.id ?? 'adventure-1', ...value }))
		};
		stageAttemptsRepository = {
			create: jest.fn((value) => value),
			find: jest.fn(),
			save: jest.fn(async (value) => value)
		};
		strollsRepository = {
			find: jest.fn(),
			findOne: jest.fn()
		};
		stagesRepository = {
			count: jest.fn(),
			find: jest.fn(),
			findOne: jest.fn()
		};
		usersRepository = {
			find: jest.fn(),
			findOne: jest.fn()
		};
		adventureResultsService = { recordCompletion: jest.fn().mockResolvedValue(undefined) };
		badgesService = { evaluateAndAward: jest.fn().mockResolvedValue([]) };
		emailService = { sendStrollPurchasedEmail: jest.fn().mockResolvedValue(undefined) };
		service = new AdventuresService(
			adventuresRepository,
			stageAttemptsRepository,
			strollsRepository,
			stagesRepository,
			usersRepository,
			adventureResultsService,
			badgesService,
			emailService
		);
	});

	it('rejects unlocking strolls that are not published and browsable', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ activeStatus: StrollActiveStatus.DRAFT }));

		await expect(service.unlock({ strollId: 'stroll-1' }, simpleUser)).rejects.toThrow(ForbiddenException);
		expect(adventuresRepository.save).not.toHaveBeenCalled();
	});

	it('returns an existing active adventure instead of creating a duplicate unlock', async () => {
		const existingAdventure = buildAdventure({ id: 'existing-adventure', progressStatus: AdventureProgressStatus.IN_PROGRESS });
		strollsRepository.findOne.mockResolvedValue(buildStroll());
		adventuresRepository.findOne.mockResolvedValue(existingAdventure);

		await expect(service.unlock({ strollId: 'stroll-1' }, simpleUser)).resolves.toBe(existingAdventure);
		expect(adventuresRepository.save).not.toHaveBeenCalled();
		expect(badgesService.evaluateAndAward).not.toHaveBeenCalled();
	});

	it('rejects unlocks when the user purchase quota is reached with a stable error code', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ publicityFlag: StrollPublicityFlag.PUBLIC }));
		adventuresRepository.findOne.mockResolvedValue(null);
		quotaQueryBuilder.getCount.mockResolvedValue(10);

		await expect(service.unlock({ strollId: 'stroll-1' }, simpleUser)).rejects.toMatchObject({
			response: {
				code: AppErrorCode.PURCHASE_QUOTA_REACHED,
				message: 'Your account type can unlock up to 10 public strolls.'
			}
		});
		expect(adventuresRepository.save).not.toHaveBeenCalled();
	});

	it('creates a new adventure, awards badges, and notifies another author on unlock', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ authorId: 'author-1' }));
		adventuresRepository.findOne.mockResolvedValue(null);
		usersRepository.findOne.mockResolvedValue({ email: 'author@example.com', username: 'author', preferredLanguage: 'hu' });

		const result = await service.unlock({ strollId: 'stroll-1' }, simpleUser);

		expect(result).toMatchObject({ ownerUserId: simpleUser.userId, strollId: 'stroll-1', progressStatus: AdventureProgressStatus.PURCHASED });
		expect(badgesService.evaluateAndAward).toHaveBeenCalledWith(simpleUser.userId);
		expect(emailService.sendStrollPurchasedEmail).toHaveBeenCalledWith('author@example.com', 'author', 'A stroll', 'hu');
	});

	it('records incorrect answers without advancing the adventure', async () => {
		const adventure = buildAdventure({ currentStageIndex: 1, progressStatus: AdventureProgressStatus.IN_PROGRESS });
		adventuresRepository.findOne.mockResolvedValue(adventure);
		stagesRepository.findOne.mockResolvedValue(buildStage({ id: 'stage-1', riddleAnswer: 'neo-gothic' }));

		const result = await service.submitAnswer(adventure.id, 'stage-1', { answer: 'baroque' }, simpleUser);

		expect(result).toEqual({ isCorrect: false, adventure, stageId: 'stage-1' });
		expect(stageAttemptsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({ adventureId: adventure.id, stageId: 'stage-1', providedAnswer: 'baroque', isCorrect: false })
		);
		expect(adventuresRepository.save).not.toHaveBeenCalled();
		expect(adventure.currentStageIndex).toBe(1);
	});

	it('advances to the next stage after a correct answer', async () => {
		const adventure = buildAdventure({ currentStageIndex: 1, progressStatus: AdventureProgressStatus.PURCHASED });
		adventuresRepository.findOne.mockResolvedValue(adventure);
		stagesRepository.findOne.mockResolvedValue(buildStage({ id: 'stage-1', riddleAnswer: 'Neo-Gothic' }));
		stagesRepository.count.mockResolvedValue(2);

		const result = await service.submitAnswer(adventure.id, 'stage-1', { answer: ' neo-gothic ' }, simpleUser);

		expect(result.isCorrect).toBe(true);
		expect(adventure.progressStatus).toBe(AdventureProgressStatus.IN_PROGRESS);
		expect(adventure.currentStageIndex).toBe(2);
		expect(adventuresRepository.save).toHaveBeenCalledWith(adventure);
	});

	it('completes the adventure after a correct answer on the final stage', async () => {
		const adventure = buildAdventure({ currentStageIndex: 2, progressStatus: AdventureProgressStatus.IN_PROGRESS });
		adventuresRepository.findOne.mockResolvedValue(adventure);
		stagesRepository.findOne.mockResolvedValue(buildStage({ id: 'stage-2', riddleAnswer: 'finish' }));
		stagesRepository.count.mockResolvedValue(2);

		await expect(service.submitAnswer(adventure.id, 'stage-2', { answer: 'finish' }, simpleUser)).resolves.toMatchObject({ isCorrect: true });
		expect(adventure.progressStatus).toBe(AdventureProgressStatus.COMPLETED);
		expect(adventure.completionDateTime).toBeInstanceOf(Date);
	});

	it('sanitizes riddle answers for non-admin adventure detail reads', async () => {
		const adventure = buildAdventure({ currentStageIndex: 1 });
		adventuresRepository.findOne.mockResolvedValue(adventure);
		strollsRepository.findOne.mockResolvedValue(buildStroll());
		stagesRepository.find.mockResolvedValue([buildStage({ id: 'stage-1', riddleAnswer: 'secret' })]);

		const result = await service.get(adventure.id, simpleUser);

		expect(result.currentStage).toEqual(expect.not.objectContaining({ riddleAnswer: expect.anything() }));
	});

	it('records completion results and re-evaluates badges when reading a completed result', async () => {
		const startDateTime = new Date('2026-09-25T10:00:00.000Z');
		const completionDateTime = new Date('2026-09-25T10:30:00.000Z');
		const adventure = buildAdventure({
			progressStatus: AdventureProgressStatus.COMPLETED,
			currentStageIndex: 2,
			startDateTime,
			completionDateTime
		});
		adventuresRepository.findOne.mockResolvedValue(adventure);
		strollsRepository.findOne.mockResolvedValue(buildStroll());
		stagesRepository.find.mockResolvedValue([
			buildStage({ id: 'stage-1', latitude: 47.4979, longitude: 19.0402 }),
			buildStage({ id: 'stage-2', latitude: 47.5, longitude: 19.05 })
		]);
		stageAttemptsRepository.find.mockResolvedValue([
			{ stageId: 'stage-1', isCorrect: true },
			{ stageId: 'stage-1', isCorrect: true },
			{ stageId: 'stage-2', isCorrect: false }
		]);

		const result = await service.getResult(adventure.id, simpleUser);

		expect(result).toMatchObject({ completedStageCount: 2, elapsedSeconds: 1800, correctAnswerCount: 1, totalStageCount: 2 });
		expect(adventureResultsService.recordCompletion).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: simpleUser.userId,
				strollId: adventure.strollId,
				adventureId: adventure.id,
				completedStageCount: 2,
				elapsedSeconds: 1800,
				completedAt: completionDateTime
			})
		);
		expect(badgesService.evaluateAndAward).toHaveBeenCalledWith(simpleUser.userId);
	});

	it('rejects access to another user adventure', async () => {
		adventuresRepository.findOne.mockResolvedValue(buildAdventure({ ownerUserId: 'another-user' }));

		await expect(service.get('550e8400-e29b-41d4-a716-446655440000', simpleUser)).rejects.toThrow(ForbiddenException);
	});

	it('requires admin role for assigning adventures', async () => {
		await expect(service.assignAdventure({ strollId: 'stroll-1', userId: 'target-user' }, simpleUser)).rejects.toThrow(ForbiddenException);
	});
});

function buildAdventure(overrides: Partial<AdventureEntity> = {}): AdventureEntity {
	return {
		id: '550e8400-e29b-41d4-a716-446655440000',
		ownerUserId: 'user-1',
		strollId: 'stroll-1',
		purchaseTime: new Date('2026-09-25T09:00:00.000Z'),
		startDateTime: null,
		completionDateTime: null,
		progressStatus: AdventureProgressStatus.PURCHASED,
		currentStageIndex: 1,
		createdAt: new Date(),
		updatedAt: new Date(),
		setIdIfMissing: jest.fn(),
		...overrides
	};
}

function buildStroll(overrides: Partial<StrollEntity> = {}): StrollEntity {
	return {
		id: 'stroll-1',
		name: 'A stroll',
		authorId: 'author-1',
		activeStatus: StrollActiveStatus.PUBLISHED,
		labels: [],
		category: StrollCategory.HISTORICAL,
		description: 'A description',
		publicityFlag: StrollPublicityFlag.PUBLIC,
		stageCount: 2,
		length: 0,
		ratingAverage: 0,
		ratingCount: 0,
		reported: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		setIdIfMissing: jest.fn(),
		...overrides
	};
}

function buildStage(overrides: Partial<StageEntity> = {}): StageEntity {
	return {
		id: 'stage-1',
		strollId: 'stroll-1',
		orderIndex: 1,
		name: 'Stage',
		description: 'A stage',
		notes: null,
		imageUrls: [],
		videoUrls: [],
		address: null,
		latitude: null,
		longitude: null,
		riddleAnswer: 'answer',
		createdAt: new Date(),
		updatedAt: new Date(),
		setIdIfMissing: jest.fn(),
		...overrides
	};
}
