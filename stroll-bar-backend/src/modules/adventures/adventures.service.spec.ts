import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppErrorCode } from '../../common/utils/app-error-code';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { UserRole } from '../users/entities/user.entity';
import { AdventureEntity, AdventureProgressStatus } from './entities/adventure.entity';
import { StageAttemptEntity } from './entities/stage-attempt.entity';
import { ACTIVE_ADVENTURE_STATUSES, AdventuresService } from './adventures.service';
import { AdventuresController } from './adventures.controller';

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
		const manager = {
			getRepository: jest.fn((entity) => {
				if (entity === AdventureEntity) return adventuresRepository;
				if (entity === StageAttemptEntity) return stageAttemptsRepository;
				if (entity === StrollEntity) return strollsRepository;
				if (entity === StageEntity) return stagesRepository;
				throw new Error(`Unexpected transactional repository: ${entity.name}`);
			})
		};
		adventuresRepository.manager = {
			transaction: jest.fn(async (callback) => callback(manager))
		};
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

	describe('revoked entitlement', () => {
		const admin = { ...simpleUser, userId: 'admin-1', role: UserRole.ADMIN };
		const operations = [
			['detail', (id: string, user: AuthenticatedUser) => service.get(id, user)],
			['start', (id: string, user: AuthenticatedUser) => service.start(id, user)],
			['next', (id: string, user: AuthenticatedUser) => service.navigate(id, { direction: 'next' }, user)],
			['previous', (id: string, user: AuthenticatedUser) => service.navigate(id, { direction: 'previous' }, user)],
			['answer', (id: string, user: AuthenticatedUser) => service.submitAnswer(id, 'stage-1', { answer: 'answer' }, user)],
			['result', (id: string, user: AuthenticatedUser) => service.getResult(id, user)]
		] as const;

		it.each(operations)('rejects %s for an already revoked adventure without content or writes', async (_name, operation) => {
			const adventure = buildAdventure({ progressStatus: AdventureProgressStatus.REVOKED });
			adventuresRepository.findOne.mockResolvedValue(adventure);

			await expect(operation(adventure.id, simpleUser)).rejects.toThrow(ForbiddenException);

			expect(adventure.progressStatus).toBe(AdventureProgressStatus.REVOKED);
			expect(adventuresRepository.save).not.toHaveBeenCalled();
			expect(stageAttemptsRepository.save).not.toHaveBeenCalled();
			expect(strollsRepository.findOne).not.toHaveBeenCalled();
			expect(stagesRepository.find).not.toHaveBeenCalled();
			expect(stagesRepository.findOne).not.toHaveBeenCalled();
			expect(adventureResultsService.recordCompletion).not.toHaveBeenCalled();
			expect(badgesService.evaluateAndAward).not.toHaveBeenCalled();
		});

		it('denies every protected operation immediately after an admin revokes an active adventure', async () => {
			const adventure = buildAdventure();
			adventuresRepository.findOne.mockResolvedValue(adventure);
			await service.revokeAdventure(adventure.id, admin);
			adventuresRepository.save.mockClear();

			for (const [, operation] of operations) {
				await expect(operation(adventure.id, simpleUser)).rejects.toThrow(ForbiddenException);
			}

			expect(adventure.progressStatus).toBe(AdventureProgressStatus.REVOKED);
			expect(adventuresRepository.save).not.toHaveBeenCalled();
			expect(stageAttemptsRepository.save).not.toHaveBeenCalled();
		});

		it('returns HTTP 403 for direct protected requests after admin revocation', async () => {
			const adventure = buildAdventure();
			adventuresRepository.findOne.mockResolvedValue(adventure);
			let requestUser: AuthenticatedUser = admin;
			const module = await Test.createTestingModule({
				controllers: [AdventuresController],
				providers: [{ provide: AdventuresService, useValue: service }]
			})
				.overrideGuard(JwtAuthGuard)
				.useValue({ canActivate: (context: any) => {
					context.switchToHttp().getRequest().user = requestUser;
					return true;
				} })
				.overrideGuard(EmailVerifiedGuard)
				.useValue({ canActivate: () => true })
				.compile();
			const app = module.createNestApplication();
			await app.init();
			try {
				await request(app.getHttpServer()).delete(`/adventures/admin/${adventure.id}`).expect(200);
				requestUser = simpleUser;
				adventuresRepository.save.mockClear();
				const path = `/adventures/${adventure.id}`;
				await request(app.getHttpServer()).get(path).expect(403);
				await request(app.getHttpServer()).get(`${path}/result`).expect(403);
				await request(app.getHttpServer()).post(`${path}/start`).expect(403);
				await request(app.getHttpServer()).post(`${path}/navigate`).send({ direction: 'next' }).expect(403);
				await request(app.getHttpServer()).post(`${path}/navigate`).send({ direction: 'previous' }).expect(403);
				await request(app.getHttpServer()).post(`${path}/stages/stage-1/answer`).send({ answer: 'answer' }).expect(403);
				expect(adventure.progressStatus).toBe(AdventureProgressStatus.REVOKED);
				expect(adventuresRepository.save).not.toHaveBeenCalled();
				expect(stageAttemptsRepository.save).not.toHaveBeenCalled();
			} finally {
				await app.close();
			}
		});

		it('filters revoked adventures from ordinary listings, including their stage and media content', async () => {
			adventuresRepository.find.mockImplementation(async ({ where }: any) => {
				expect(where.ownerUserId).toBe(simpleUser.userId);
				expect(where.progressStatus.value).toEqual(ACTIVE_ADVENTURE_STATUSES);
				return [buildAdventure({ progressStatus: AdventureProgressStatus.REVOKED })]
					.filter((adventure) => where.progressStatus.value.includes(adventure.progressStatus));
			});

			await expect(service.list(simpleUser)).resolves.toEqual([]);
			expect(strollsRepository.find).not.toHaveBeenCalled();
			expect(stagesRepository.find).not.toHaveBeenCalled();
		});

		it('preserves admin detail, list, and result support reads without restoring revoked progress', async () => {
			const adventure = buildAdventure({ progressStatus: AdventureProgressStatus.REVOKED, currentStageIndex: 1 });
			adventuresRepository.findOne.mockResolvedValue(adventure);
			adventuresRepository.find.mockResolvedValue([adventure]);
			strollsRepository.findOne.mockResolvedValue(buildStroll());
			strollsRepository.find.mockResolvedValue([buildStroll()]);
			stagesRepository.find.mockResolvedValue([buildStage({ riddleAnswer: 'support-answer' })]);
			stageAttemptsRepository.find.mockResolvedValue([]);

			await expect(service.get(adventure.id, admin)).resolves.toMatchObject({
				adventure: { progressStatus: AdventureProgressStatus.REVOKED },
				currentStage: { riddleAnswer: 'support-answer' }
			});
			await expect(service.list(admin)).resolves.toHaveLength(1);
			expect(adventuresRepository.find).toHaveBeenCalledWith({ where: {}, order: { updatedAt: 'DESC' } });
			await expect(service.getResult(adventure.id, admin)).resolves.toMatchObject({
				adventure: { progressStatus: AdventureProgressStatus.REVOKED }
			});
			expect(adventuresRepository.save).not.toHaveBeenCalled();
			expect(adventureResultsService.recordCompletion).not.toHaveBeenCalled();
			expect(badgesService.evaluateAndAward).not.toHaveBeenCalled();
		});

		it.each(operations.filter(([name]) => !['detail', 'result'].includes(name)))(
			'does not let admin support %s reactivate revoked progress',
			async (_name, operation) => {
				const adventure = buildAdventure({ progressStatus: AdventureProgressStatus.REVOKED });
				adventuresRepository.findOne.mockResolvedValue(adventure);
				await expect(operation(adventure.id, admin)).rejects.toThrow(ForbiddenException);
				expect(adventuresRepository.save).not.toHaveBeenCalled();
				expect(stageAttemptsRepository.save).not.toHaveBeenCalled();
			}
		);

		it.each(['start', 'revoke'] as const)('serializes concurrent revoke/start when %s obtains the row lock first', async (first) => {
			let stored = buildAdventure();
			let lockTail = Promise.resolve();
			const firstLocked = deferred();
			const continueFirst = deferred();
			let transactionCount = 0;
			const saves: AdventureProgressStatus[] = [];

			adventuresRepository.manager.transaction.mockImplementation(async (callback: any) => {
				const transactionIndex = transactionCount++;
				let unlock: (() => void) | undefined;
				const repository = {
					findOne: jest.fn(async (options: any) => {
						expect(options).toMatchObject({ where: { id: stored.id }, lock: { mode: 'pessimistic_write' } });
						const previous = lockTail;
						lockTail = new Promise<void>((resolve) => { unlock = resolve; });
						await previous;
						if (transactionIndex === 0) {
							firstLocked.resolve();
							await continueFirst.promise;
						}
						return { ...stored };
					}),
					save: jest.fn(async (adventure: AdventureEntity) => {
						stored = buildAdventure(adventure);
						saves.push(stored.progressStatus);
						return adventure;
					})
				};
				try {
					return await callback({ getRepository: (entity: unknown) => {
						expect(entity).toBe(AdventureEntity);
						return repository;
					} });
				} finally {
					unlock?.();
				}
			});

			const start = () => service.start(stored.id, simpleUser);
			const revoke = () => service.revokeAdventure(stored.id, admin);
			const firstRequest = first === 'start' ? start() : revoke();
			await firstLocked.promise;
			const secondRequest = first === 'start' ? revoke() : start();
			// Attach rejection handlers before allowing either transaction to finish.
			const results = Promise.allSettled([firstRequest, secondRequest]);
			continueFirst.resolve();
			const outcomes = await results;

			expect(stored.progressStatus).toBe(AdventureProgressStatus.REVOKED);
			expect(saves).toEqual(first === 'start'
				? [AdventureProgressStatus.IN_PROGRESS, AdventureProgressStatus.REVOKED]
				: [AdventureProgressStatus.REVOKED]);
			expect(outcomes[0].status).toBe('fulfilled');
			if (first === 'revoke') {
				expect(outcomes[1]).toMatchObject({ status: 'rejected', reason: expect.any(ForbiddenException) });
			} else {
				expect(outcomes[1].status).toBe('fulfilled');
			}
		});
	});
});

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((complete) => { resolve = complete; });
	return { promise, resolve };
}

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
