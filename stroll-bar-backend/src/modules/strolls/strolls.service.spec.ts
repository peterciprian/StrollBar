import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { ACTIVE_ADVENTURE_STATUSES } from '../adventures/adventures.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StageEntity } from '../stages/entities/stage.entity';
import { UserRole } from '../users/entities/user.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';
import { StrollCategory } from './dto/stroll-category.enum';
import { StrollsService } from './strolls.service';
import { AppErrorCode } from '../../common/utils/app-error-code';

describe('StrollsService authorization', () => {
	const listQueryBuilder: Record<string, jest.Mock> = {
		where: jest.fn(() => listQueryBuilder),
		andWhere: jest.fn(() => listQueryBuilder),
		orderBy: jest.fn(() => listQueryBuilder),
		addOrderBy: jest.fn(() => listQueryBuilder),
		setParameters: jest.fn(() => listQueryBuilder),
		skip: jest.fn(() => listQueryBuilder),
		take: jest.fn(() => listQueryBuilder),
		getManyAndCount: jest.fn()
	};
	const strollsRepository = {
		count: jest.fn(),
		create: jest.fn((value) => value),
		createQueryBuilder: jest.fn(() => listQueryBuilder),
		delete: jest.fn(),
		findOne: jest.fn(),
		findAndCount: jest.fn(),
		save: jest.fn((value) => value)
	};
	const stagesRepository = {
		delete: jest.fn(),
		find: jest.fn()
	};
	const adventuresRepository = {
		find: jest.fn(),
		findOne: jest.fn()
	};
	const usersRepository = {
		findOne: jest.fn()
	};
	const cache = {
		get: jest.fn(),
		set: jest.fn(),
		deleteByPrefix: jest.fn()
	};
	const dataSource = {
		transaction: jest.fn()
	};
	const badgesService = {
		evaluateAndAward: jest.fn().mockResolvedValue([])
	};
	const emailService = {
		sendStrollStatusChangedEmail: jest.fn().mockResolvedValue(undefined),
		sendStrollCreatedEmail: jest.fn().mockResolvedValue(undefined)
	};
	const service = new StrollsService(
		strollsRepository as unknown as Repository<StrollEntity>,
		stagesRepository as unknown as Repository<StageEntity>,
		adventuresRepository as unknown as Repository<AdventureEntity>,
		usersRepository as never,
		cache as never,
		badgesService as never,
		emailService as never,
		dataSource as never
	);
	const createDto = {
		name: 'A stroll',
		description: 'A description',
		publicityFlag: StrollPublicityFlag.PUBLIC
	};
	const simpleUser: AuthenticatedUser = {
		userId: 'simple-user',
		email: 'simple@example.com',
		username: 'simple',
		role: UserRole.SIMPLE
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('rejects a fourth public stroll for a simple user', async () => {
		strollsRepository.count.mockResolvedValue(3);

		await expect(service.create(createDto, simpleUser)).rejects.toThrow(ForbiddenException);
		expect(strollsRepository.save).not.toHaveBeenCalled();
	});

	it('allows a premium user to create a private stroll', async () => {
		const premiumUser = { ...simpleUser, role: UserRole.PREMIUM };
		strollsRepository.save.mockImplementationOnce(async (value) => value);

		const result = await service.create({ ...createDto, publicityFlag: StrollPublicityFlag.PRIVATE }, premiumUser);

		expect(result.publicityFlag).toBe(StrollPublicityFlag.PRIVATE);
		expect(strollsRepository.count).not.toHaveBeenCalled();
	});

	it('rejects a private stroll for a simple user without counting', async () => {
		await expect(service.create({ ...createDto, publicityFlag: StrollPublicityFlag.PRIVATE }, simpleUser)).rejects.toMatchObject({
			response: {
				code: AppErrorCode.STROLL_PUBLICITY_NOT_ALLOWED,
				message: 'Your account type cannot create private or unlisted strolls.'
			}
		});
		expect(strollsRepository.count).not.toHaveBeenCalled();
	});

	it('allows a creator a fourth public stroll but rejects a fourth private one', async () => {
		const creatorUser = { ...simpleUser, role: UserRole.CREATOR };

		strollsRepository.count.mockResolvedValue(3);
		await expect(service.create(createDto, creatorUser)).resolves.toBeDefined();

		strollsRepository.count.mockResolvedValue(3);
		await expect(service.create({ ...createDto, publicityFlag: StrollPublicityFlag.PRIVATE }, creatorUser)).rejects.toThrow(ForbiddenException);
	});

	it('rejects a 101st public stroll for a creator', async () => {
		const creatorUser = { ...simpleUser, role: UserRole.CREATOR };
		strollsRepository.count.mockResolvedValue(20);

		await expect(service.create(createDto, creatorUser)).rejects.toMatchObject({
			response: {
				code: AppErrorCode.STROLL_QUOTA_REACHED,
				message: 'Your account type can create up to 20 public strolls.'
			}
		});
	});

	it('invalidates browse cache, awards badges, and notifies the author after creating a stroll', async () => {
		const savedStroll = buildStroll({ authorId: simpleUser.userId, activeStatus: StrollActiveStatus.DRAFT });
		strollsRepository.count.mockResolvedValue(0);
		strollsRepository.save.mockResolvedValue(savedStroll);
		usersRepository.findOne.mockResolvedValue({ email: simpleUser.email, username: simpleUser.username, preferredLanguage: 'hu' });

		const result = await service.create(createDto, simpleUser);

		expect(result).toBe(savedStroll);
		expect(cache.deleteByPrefix).toHaveBeenCalledWith('strolls:list:');
		expect(badgesService.evaluateAndAward).toHaveBeenCalledWith(simpleUser.userId);
		expect(emailService.sendStrollCreatedEmail).toHaveBeenCalledWith(simpleUser.email, simpleUser.username, savedStroll.name, 'hu');
	});

	it('requires purchase before another user can read private stroll details', async () => {
		const privateStroll = buildStroll({ publicityFlag: StrollPublicityFlag.PRIVATE });
		strollsRepository.findOne.mockResolvedValue(privateStroll);
		adventuresRepository.findOne.mockResolvedValue(null);

		await expect(service.findOne(privateStroll.id, simpleUser)).rejects.toThrow(ForbiddenException);

		adventuresRepository.findOne.mockResolvedValue({ id: 'purchase-id' });
		stagesRepository.find.mockResolvedValue([]);
		await expect(service.findOne(privateStroll.id, simpleUser)).resolves.toEqual({ stroll: privateStroll, stages: [] });
	});

	it.each(ACTIVE_ADVENTURE_STATUSES)('removes private stroll and media access when a %s purchase is revoked', async (progressStatus) => {
		const stroll = buildStroll({
			publicityFlag: StrollPublicityFlag.PRIVATE,
			mediaUrls: { imageUrls: ['https://example.com/protected-stroll.jpg'], videoUrls: [] }
		});
		const purchase = { id: 'purchase-1', progressStatus };
		strollsRepository.findOne.mockResolvedValue(stroll);
		adventuresRepository.findOne.mockImplementation(async ({ where }: any) =>
			where.progressStatus.value.includes(purchase.progressStatus) ? purchase : null
		);
		stagesRepository.find.mockResolvedValue([]);
		await expect(service.findOne(stroll.id, simpleUser)).resolves.toMatchObject({ stroll });

		purchase.progressStatus = AdventureProgressStatus.REVOKED;
		stagesRepository.find.mockClear();

		await expect(service.findOne(stroll.id, simpleUser)).rejects.toThrow(ForbiddenException);
		expect(stagesRepository.find).not.toHaveBeenCalled();
	});

	it('preserves admin support access to private stroll content without a purchase', async () => {
		const stroll = buildStroll({ publicityFlag: StrollPublicityFlag.PRIVATE });
		strollsRepository.findOne.mockResolvedValue(stroll);
		stagesRepository.find.mockResolvedValue([]);
		await expect(service.findOne(stroll.id, { ...simpleUser, role: UserRole.ADMIN })).resolves.toEqual({ stroll, stages: [] });
		expect(adventuresRepository.findOne).not.toHaveBeenCalled();
	});

	it.each([StrollPublicityFlag.PUBLIC, StrollPublicityFlag.PRIVATE, StrollPublicityFlag.UNLISTED])(
		'projects non-editor stages without mutating editor answers for %s detail', async (publicityFlag) => {
			const stroll = buildStroll({ publicityFlag });
			const stage = Object.assign(new StageEntity(), { id: 'stage-1', strollId: stroll.id, riddleAnswer: 'service-secret' });
			strollsRepository.findOne.mockResolvedValue(stroll);
			stagesRepository.find.mockResolvedValue([stage]);
			adventuresRepository.findOne.mockResolvedValue({ id: 'purchase-1' });

			const result = await service.findOne(stroll.id, simpleUser);

			expect(result.stages[0]).not.toBe(stage);
			expect(result.stages[0]).not.toHaveProperty('riddleAnswer');
			expect(JSON.stringify(result)).not.toContain('service-secret');
			expect(JSON.stringify(result)).not.toContain('riddleAnswer');
			expect(stage.riddleAnswer).toBe('service-secret');
			const editorResult = await service.findOwnedOne(stroll.id, { ...simpleUser, userId: stroll.authorId });
			expect(editorResult.stages[0]).toHaveProperty('riddleAnswer', 'service-secret');
		}
	);

	it('returns the full description for every browsable stroll', async () => {
		const publicStroll = buildStroll({
			description: 'A'.repeat(300),
			proposerText: 'Private creator notes',
			mediaUrls: {
				imageUrls: ['https://example.com/cover.jpg', 'https://example.com/secret.jpg'],
				videoUrls: ['https://example.com/secret.mp4']
			}
		});
		listQueryBuilder.getManyAndCount.mockResolvedValue([[publicStroll], 1]);

		const result = await service.list({});
		const extract = result.items[0];

		expect(extract.description).toBe(publicStroll.description);
		expect(extract).not.toHaveProperty('proposerText');
		expect(extract.mediaUrls).toEqual({ imageUrls: ['https://example.com/cover.jpg'], videoUrls: [] });
		expect(extract).toMatchObject({ id: publicStroll.id, name: publicStroll.name, stageCount: publicStroll.stageCount });
	});

	it("allows an admin to update another user's stroll", async () => {
		const stroll = buildStroll({ authorId: 'another-user' });
		const adminUser = { ...simpleUser, role: UserRole.ADMIN };
		strollsRepository.findOne.mockResolvedValue(stroll);
		strollsRepository.save.mockImplementationOnce(async (value) => value);

		await expect(service.update(stroll.id, { name: 'Updated' }, adminUser)).resolves.toMatchObject({ name: 'Updated' });
	});

	it('rejects suspension changes from non-admin users', async () => {
		const stroll = buildStroll({ authorId: simpleUser.userId, activeStatus: StrollActiveStatus.PUBLISHED });
		strollsRepository.findOne.mockResolvedValue(stroll);

		await expect(service.update(stroll.id, { activeStatus: StrollActiveStatus.SUSPENDED }, simpleUser)).rejects.toThrow(ForbiddenException);
		expect(strollsRepository.save).not.toHaveBeenCalled();
	});

	it('allows admins to reinstate a suspended stroll and notifies the author', async () => {
		const stroll = buildStroll({ authorId: 'another-user', activeStatus: StrollActiveStatus.SUSPENDED });
		const adminUser = { ...simpleUser, role: UserRole.ADMIN };
		strollsRepository.findOne.mockResolvedValue(stroll);
		stagesRepository.find.mockResolvedValue([buildReadyStage()]);
		strollsRepository.save.mockImplementationOnce(async (value) => value);
		usersRepository.findOne.mockResolvedValue({ email: 'author@example.com', username: 'author', preferredLanguage: 'en' });

		await expect(service.update(stroll.id, { activeStatus: StrollActiveStatus.PUBLISHED }, adminUser)).resolves.toMatchObject({
			activeStatus: StrollActiveStatus.PUBLISHED
		});
		expect(cache.deleteByPrefix).toHaveBeenCalledWith('strolls:list:');
		expect(emailService.sendStrollStatusChangedEmail).toHaveBeenCalledWith(
			'author@example.com',
			'author',
			stroll.name,
			StrollActiveStatus.PUBLISHED,
			'en'
		);
	});

	it('rejects explicit publication of an invalid draft with field-specific readiness feedback', async () => {
		const draft = buildStroll({ authorId: simpleUser.userId, activeStatus: StrollActiveStatus.DRAFT });
		strollsRepository.findOne.mockResolvedValue(draft);
		stagesRepository.find.mockResolvedValue([]);

		await expect(service.update(draft.id, { name: 'Attempted publish', activeStatus: StrollActiveStatus.PUBLISHED }, simpleUser)).rejects.toMatchObject({
			response: {
				code: 'STROLL_NOT_READY',
				errors: [{ field: 'stages', code: 'STROLL_STAGE_REQUIRED' }]
			}
		});
		expect(strollsRepository.save).not.toHaveBeenCalled();
	});

	it('publishes a valid draft', async () => {
		const draft = buildStroll({ authorId: simpleUser.userId, activeStatus: StrollActiveStatus.DRAFT });
		strollsRepository.findOne.mockResolvedValue(draft);
		stagesRepository.find.mockResolvedValue([buildReadyStage()]);
		strollsRepository.save.mockImplementationOnce(async (value) => value);

		await expect(service.update(draft.id, { activeStatus: StrollActiveStatus.PUBLISHED }, simpleUser)).resolves.toMatchObject({
			activeStatus: StrollActiveStatus.PUBLISHED
		});
	});

	it('keeps invalid draft edits editable without attempting publication', async () => {
		const draft = buildStroll({ authorId: simpleUser.userId, activeStatus: StrollActiveStatus.DRAFT });
		strollsRepository.findOne.mockResolvedValue(draft);
		stagesRepository.find.mockResolvedValue([]);
		strollsRepository.save.mockImplementationOnce(async (value) => value);

		await expect(service.update(draft.id, { name: '   ' }, simpleUser)).resolves.toMatchObject({
			name: '   ',
			activeStatus: StrollActiveStatus.DRAFT
		});
		expect(strollsRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: '   ', activeStatus: StrollActiveStatus.DRAFT }));
	});

	it('saves an invalidating edit and automatically returns a published stroll to draft', async () => {
		const published = buildStroll({ authorId: simpleUser.userId, activeStatus: StrollActiveStatus.PUBLISHED });
		strollsRepository.findOne.mockResolvedValue(published);
		stagesRepository.find.mockResolvedValue([buildReadyStage()]);
		strollsRepository.save.mockImplementationOnce(async (value) => value);

		const result = await service.update(published.id, { name: '   ' }, simpleUser);

		expect(result).toMatchObject({ name: '   ', activeStatus: StrollActiveStatus.DRAFT, automaticallyUnpublished: true });
		expect(strollsRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: '   ', activeStatus: StrollActiveStatus.DRAFT }));
	});

	it('rejects creating a stroll directly as published before saving', async () => {
		await expect(service.create({ ...createDto, activeStatus: StrollActiveStatus.PUBLISHED }, simpleUser)).rejects.toMatchObject({
			response: { code: 'STROLL_NOT_READY', errors: [{ field: 'stages', code: 'STROLL_STAGE_REQUIRED' }] }
		});
		expect(strollsRepository.save).not.toHaveBeenCalled();
	});

	it('rejects invalid published bulk imports before starting the transaction', async () => {
		const adminUser = { ...simpleUser, role: UserRole.ADMIN };
		await expect(
			service.bulkImport(
				{
					stroll: { name: 'Imported', description: 'Imported description', activeStatus: StrollActiveStatus.PUBLISHED },
					stages: []
				} as any,
				adminUser
			)
		).rejects.toMatchObject({ response: { code: 'STROLL_NOT_READY', errors: expect.any(Array) } });
		expect(dataSource.transaction).not.toHaveBeenCalled();
	});

	it('accepts a valid published bulk import with an address location alternative', async () => {
		const adminUser = { ...simpleUser, role: UserRole.ADMIN };
		const manager = {
			create: jest.fn((_entity, value) => value),
			save: jest.fn(async (_entity, value) => (Array.isArray(value) ? value : { ...value, id: 'imported-stroll-id' }))
		};
		dataSource.transaction.mockImplementationOnce(async (callback) => callback(manager));

		await expect(
			service.bulkImport(
				{
					stroll: { name: 'Imported', description: 'Imported description', activeStatus: StrollActiveStatus.PUBLISHED },
					stages: [{ orderIndex: 1, name: 'Stage', description: 'Stage description', address: 'Main Street' }]
				} as any,
				adminUser
			)
		).resolves.toMatchObject({ stroll: { activeStatus: StrollActiveStatus.PUBLISHED }, stages: [{ address: 'Main Street' }] });
		expect(dataSource.transaction).toHaveBeenCalledTimes(1);
	});

	it('clears private pricing when a stroll becomes public', async () => {
		const stroll = buildStroll({
			authorId: simpleUser.userId,
			publicityFlag: StrollPublicityFlag.PRIVATE,
			price: { amount: 1200, currency: 'HUF' }
		});
		const premiumUser = { ...simpleUser, role: UserRole.PREMIUM };
		strollsRepository.findOne.mockResolvedValue(stroll);
		strollsRepository.save.mockImplementationOnce(async (value) => value);

		await expect(service.update(stroll.id, { publicityFlag: StrollPublicityFlag.PUBLIC }, premiumUser)).resolves.toMatchObject({
			publicityFlag: StrollPublicityFlag.PUBLIC,
			price: null
		});
	});

	it('invalidates browse cache after deleting a stroll and its stages', async () => {
		const stroll = buildStroll({ authorId: simpleUser.userId });
		strollsRepository.findOne.mockResolvedValue(stroll);

		await expect(service.remove(stroll.id, simpleUser)).resolves.toEqual({ id: stroll.id, deleted: true });
		expect(stagesRepository.delete).toHaveBeenCalledWith({ strollId: stroll.id });
		expect(strollsRepository.delete).toHaveBeenCalledWith({ id: stroll.id });
		expect(cache.deleteByPrefix).toHaveBeenCalledWith('strolls:list:');
	});

	it('bulk imports a stroll and stages in one admin transaction', async () => {
		const adminUser = { ...simpleUser, role: UserRole.ADMIN };
		const manager = {
			create: jest.fn((_entity, value) => value),
			save: jest.fn(async (_entity, value) => (Array.isArray(value) ? value : { ...value, id: 'imported-stroll-id' }))
		};
		dataSource.transaction.mockImplementationOnce(async (callback) => callback(manager));

		const result = await service.bulkImport(
			{
				stroll: {
					name: 'Imported stroll',
					description: 'An imported stroll description.',
					labels: ['History'],
					mediaUrls: { imageUrls: ['https://example.com/stroll.jpg'], videoUrls: [] }
				},
				stages: [
					{
						orderIndex: 0,
						name: 'Imported stage',
						description: 'An imported stage description.',
						imageUrls: [],
						videoUrls: []
					}
				]
			} as any,
			adminUser
		);

		expect(dataSource.transaction).toHaveBeenCalledTimes(1);
		expect(manager.save).toHaveBeenCalledTimes(3);
		expect(result.stroll.id).toBe('imported-stroll-id');
		expect(result.stages).toHaveLength(1);
		expect(result.stages[0].strollId).toBe('imported-stroll-id');
	});
});

function buildStroll(overrides: Partial<StrollEntity> = {}): StrollEntity {
	return {
		id: 'stroll-id',
		name: 'A stroll',
		authorId: 'author-id',
		activeStatus: StrollActiveStatus.PUBLISHED,
		labels: [],
		category: StrollCategory.HISTORICAL,
		description: 'A description',
		publicityFlag: StrollPublicityFlag.PUBLIC,
		stageCount: 0,
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

function buildReadyStage(): StageEntity {
	return Object.assign(new StageEntity(), {
		id: 'ready-stage',
		strollId: 'stroll-id',
		orderIndex: 1,
		name: 'Stage',
		description: 'A complete stage description',
		address: null,
		latitude: 47.5,
		longitude: 19.05
	});
}
