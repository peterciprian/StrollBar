import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StageEntity } from '../stages/entities/stage.entity';
import { UserRole } from '../users/entities/user.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';
import { StrollCategory } from './dto/stroll-category.enum';
import { StrollsService } from './strolls.service';

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
	const cache = {
		get: jest.fn(),
		set: jest.fn(),
		deleteByPrefix: jest.fn()
	};
	const dataSource = {
		transaction: jest.fn()
	};
	const service = new StrollsService(
		strollsRepository as unknown as Repository<StrollEntity>,
		stagesRepository as unknown as Repository<StageEntity>,
		adventuresRepository as unknown as Repository<AdventureEntity>,
		cache as never,
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

	it('requires purchase before another user can read private stroll details', async () => {
		const privateStroll = buildStroll({ publicityFlag: StrollPublicityFlag.PRIVATE });
		strollsRepository.findOne.mockResolvedValue(privateStroll);
		adventuresRepository.findOne.mockResolvedValue(null);

		await expect(service.findOne(privateStroll.id, simpleUser)).rejects.toThrow(ForbiddenException);

		adventuresRepository.findOne.mockResolvedValue({ id: 'purchase-id' });
		stagesRepository.find.mockResolvedValue([]);
		await expect(service.findOne(privateStroll.id, simpleUser)).resolves.toEqual({ stroll: privateStroll, stages: [] });
	});

	it('returns a sanitized advertising extract for every browsable stroll', async () => {
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

		expect(extract.description).toHaveLength(243);
		expect(extract.description.endsWith('...')).toBe(true);
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
		createdAt: new Date(),
		updatedAt: new Date(),
		setIdIfMissing: jest.fn(),
		...overrides
	};
}
