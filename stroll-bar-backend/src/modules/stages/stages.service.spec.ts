import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { UserRole } from '../users/entities/user.entity';
import { StageEntity } from './entities/stage.entity';
import { StagesService } from './stages.service';

describe('StagesService', () => {
	let stagesRepository: any;
	let strollsRepository: any;
	let adventuresRepository: any;
	let service: StagesService;

	const owner: AuthenticatedUser = {
		userId: 'owner-1',
		email: 'owner@example.com',
		username: 'owner',
		role: UserRole.CREATOR
	};
	const otherUser: AuthenticatedUser = {
		userId: 'other-user',
		email: 'other@example.com',
		username: 'other',
		role: UserRole.SIMPLE
	};

	beforeEach(() => {
		stagesRepository = {
			count: jest.fn(),
			create: jest.fn((value) => value),
			find: jest.fn(),
			findOne: jest.fn(),
			remove: jest.fn(async (value) => value),
			save: jest.fn(async (value) => value)
		};
		strollsRepository = {
			findOne: jest.fn(),
			save: jest.fn(async (value) => value)
		};
		adventuresRepository = {
			findOne: jest.fn()
		};
		service = new StagesService(stagesRepository, strollsRepository, adventuresRepository);
	});

	it('strips riddle answers when anonymous users list public stages', async () => {
		strollsRepository.findOne.mockResolvedValue(
			buildStroll({ activeStatus: StrollActiveStatus.PUBLISHED, publicityFlag: StrollPublicityFlag.PUBLIC })
		);
		stagesRepository.find.mockResolvedValue([buildStage({ id: 'stage-1', riddleAnswer: 'secret' })]);

		const result = await service.list('stroll-1');

		expect(result[0]).toEqual(expect.not.objectContaining({ riddleAnswer: expect.anything() }));
	});

	it('keeps riddle answers visible for the owner', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ authorId: owner.userId }));
		stagesRepository.find.mockResolvedValue([buildStage({ riddleAnswer: 'secret' })]);

		const result = await service.list('stroll-1', owner);

		expect((result[0] as StageEntity).riddleAnswer).toBe('secret');
	});

	it('allows a purchaser to list private published stages without riddle answers', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ publicityFlag: StrollPublicityFlag.PRIVATE }));
		adventuresRepository.findOne.mockResolvedValue({ id: 'purchase-1' });
		stagesRepository.find.mockResolvedValue([buildStage({ riddleAnswer: 'private-secret' })]);

		const result = await service.list('stroll-1', otherUser);

		expect(adventuresRepository.findOne).toHaveBeenCalledWith({
			select: { id: true },
			where: { strollId: 'stroll-1', ownerUserId: otherUser.userId }
		});
		expect(result[0]).toEqual(expect.not.objectContaining({ riddleAnswer: expect.anything() }));
	});

	it('rejects stage mutations from users who do not own the stroll', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ authorId: owner.userId }));

		await expect(service.create('stroll-1', { orderIndex: 1, name: 'Stage', description: 'Description' }, otherUser)).rejects.toThrow(
			ForbiddenException
		);
		expect(stagesRepository.save).not.toHaveBeenCalled();
	});

	it('creates a stage with normalized riddle answer and refreshes stroll stage metadata', async () => {
		const stroll = buildStroll({ authorId: owner.userId });
		const savedStage = buildStage({ id: 'stage-new', orderIndex: 1, riddleAnswer: 'neo-gothic' });
		strollsRepository.findOne.mockResolvedValue(stroll);
		stagesRepository.save.mockResolvedValue(savedStage);
		stagesRepository.count.mockResolvedValue(2);
		stagesRepository.find.mockResolvedValue([
			buildStage({ orderIndex: 1, latitude: 47.4979, longitude: 19.0402 }),
			buildStage({ id: 'stage-2', orderIndex: 2, latitude: 47.5, longitude: 19.05 })
		]);

		const result = await service.create(
			'stroll-1',
			{ orderIndex: 1, name: 'Stage', description: 'Description', riddleAnswer: ' Neo-Gothic ' },
			owner
		);

		expect(result).toBe(savedStage);
		expect(stagesRepository.create).toHaveBeenCalledWith(expect.objectContaining({ riddleAnswer: 'neo-gothic' }));
		expect(stroll.stageCount).toBe(2);
		expect(stroll.length).toBeGreaterThan(0);
		expect(strollsRepository.save).toHaveBeenCalledWith(stroll);
	});

	it('surfaces duplicate order indexes as conflict errors', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ authorId: owner.userId }));
		stagesRepository.save.mockRejectedValue(new QueryFailedError('', [], Object.assign(new Error('duplicate key'), { code: '23505' })));

		await expect(service.create('stroll-1', { orderIndex: 1, name: 'Stage', description: 'Description' }, owner)).rejects.toThrow(
			ConflictException
		);
	});

	it('reorders stages and recalculates stroll length using the new order', async () => {
		const stroll = buildStroll({ authorId: owner.userId });
		const firstStage = buildStage({ id: 'stage-1', orderIndex: 1, latitude: 47.4979, longitude: 19.0402 });
		const secondStage = buildStage({ id: 'stage-2', orderIndex: 2, latitude: 47.5, longitude: 19.05 });
		strollsRepository.findOne.mockResolvedValueOnce(stroll).mockResolvedValueOnce(stroll);
		stagesRepository.find.mockResolvedValue([firstStage, secondStage]);

		const result = await service.reorder(
			'stroll-1',
			{
				items: [
					{ stageId: 'stage-2', orderIndex: 1 },
					{ stageId: 'stage-1', orderIndex: 2 }
				]
			},
			owner
		);

		expect(result).toEqual({ strollId: 'stroll-1', reordered: 2 });
		expect(firstStage.orderIndex).toBe(2);
		expect(secondStage.orderIndex).toBe(1);
		expect(stagesRepository.save).toHaveBeenCalledWith([firstStage, secondStage]);
		expect(stroll.length).toBeGreaterThan(0);
		expect(strollsRepository.save).toHaveBeenCalledWith(stroll);
	});

	it('rejects reorder payloads that reference stages outside the stroll', async () => {
		strollsRepository.findOne.mockResolvedValue(buildStroll({ authorId: owner.userId }));
		stagesRepository.find.mockResolvedValue([buildStage({ id: 'stage-1' })]);

		await expect(service.reorder('stroll-1', { items: [{ stageId: 'missing-stage', orderIndex: 1 }] }, owner)).rejects.toThrow(NotFoundException);
	});

	it('updates stage fields, normalizes riddle answer, and refreshes route length', async () => {
		const stage = buildStage({ id: 'stage-1', riddleAnswer: 'old-answer' });
		const stroll = buildStroll({ authorId: owner.userId });
		strollsRepository.findOne.mockResolvedValueOnce(stroll).mockResolvedValueOnce(stroll);
		stagesRepository.findOne.mockResolvedValue(stage);
		stagesRepository.find.mockResolvedValue([stage, buildStage({ id: 'stage-2', orderIndex: 2, latitude: 47.5, longitude: 19.05 })]);

		await expect(service.update('stroll-1', 'stage-1', { name: 'Updated', riddleAnswer: ' New Answer ' }, owner)).resolves.toMatchObject({
			name: 'Updated',
			riddleAnswer: 'new answer'
		});
		expect(strollsRepository.save).toHaveBeenCalledWith(stroll);
	});

	it('removes a stage and refreshes stroll stage metadata', async () => {
		const stroll = buildStroll({ authorId: owner.userId, stageCount: 2 });
		const stage = buildStage({ id: 'stage-1' });
		strollsRepository.findOne.mockResolvedValue(stroll);
		stagesRepository.findOne.mockResolvedValue(stage);
		stagesRepository.count.mockResolvedValue(1);
		stagesRepository.find.mockResolvedValue([buildStage({ id: 'stage-2', orderIndex: 1 })]);

		await expect(service.remove('stroll-1', 'stage-1', owner)).resolves.toEqual({ id: 'stage-1', deleted: true });
		expect(stagesRepository.remove).toHaveBeenCalledWith(stage);
		expect(stroll.stageCount).toBe(1);
		expect(strollsRepository.save).toHaveBeenCalledWith(stroll);
	});
});

function buildStroll(overrides: Partial<StrollEntity> = {}): StrollEntity {
	return {
		id: 'stroll-1',
		name: 'A stroll',
		authorId: 'owner-1',
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
		riddleAnswer: 'secret',
		createdAt: new Date(),
		updatedAt: new Date(),
		setIdIfMissing: jest.fn(),
		...overrides
	};
}
