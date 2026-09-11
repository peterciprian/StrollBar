import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { StrollReportEntity } from './entities/stroll-report.entity';
import { StrollReportsService } from './stroll-reports.service';

describe('StrollReportsService', () => {
	let reportsRepository: any;
	let strollsRepository: any;
	let usersRepository: any;
	let service: StrollReportsService;

	const reporter: AuthenticatedUser = { userId: 'reporter-1', email: 'reporter@example.com', username: 'reporter', role: UserRole.SIMPLE };
	const admin: AuthenticatedUser = { userId: 'admin-1', email: 'admin@example.com', username: 'admin', role: UserRole.ADMIN };

	beforeEach(() => {
		reportsRepository = {
			create: jest.fn((value) => value),
			save: jest.fn(async (value) => ({ id: 'report-id', ...value })),
			find: jest.fn(),
			count: jest.fn()
		};
		strollsRepository = {
			findOne: jest.fn(),
			find: jest.fn(),
			save: jest.fn(async (value) => value)
		};
		usersRepository = {
			find: jest.fn()
		};
		service = new StrollReportsService(
			reportsRepository as unknown as Repository<StrollReportEntity>,
			strollsRepository as unknown as Repository<StrollEntity>,
			usersRepository as never
		);
	});

	function buildStroll(overrides: Partial<StrollEntity> = {}): StrollEntity {
		return {
			id: 'stroll-id',
			name: 'A stroll',
			authorId: 'author-1',
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

	it('throws when reporting a stroll that does not exist', async () => {
		strollsRepository.findOne.mockResolvedValue(null);

		await expect(service.create('missing-stroll', { message: 'Bad content' }, reporter)).rejects.toThrow(NotFoundException);
		expect(reportsRepository.save).not.toHaveBeenCalled();
	});

	it('flags the stroll as reported on the first report', async () => {
		const stroll = buildStroll();
		strollsRepository.findOne.mockResolvedValue(stroll);
		reportsRepository.count.mockResolvedValue(1);

		await service.create(stroll.id, { message: 'Offensive content' }, reporter);

		expect(strollsRepository.save).toHaveBeenCalledWith(expect.objectContaining({ reported: true }));
	});

	it('auto-suspends a stroll once the report threshold is reached within the time window', async () => {
		const stroll = buildStroll({ reported: true });
		strollsRepository.findOne.mockResolvedValue(stroll);
		reportsRepository.count.mockResolvedValue(5);

		await service.create(stroll.id, { message: 'Another report' }, reporter);

		expect(strollsRepository.save).toHaveBeenCalledWith(expect.objectContaining({ activeStatus: StrollActiveStatus.SUSPENDED }));
	});

	it('rejects listing reports for non-admins', async () => {
		await expect(service.listAllForAdmin(reporter)).rejects.toThrow(ForbiddenException);
	});

	it('lists reports joined with stroll and author details for admins', async () => {
		const stroll = buildStroll();
		const report: StrollReportEntity = {
			id: 'report-1',
			strollId: stroll.id,
			reporterUserId: reporter.userId,
			message: 'Offensive content',
			createdAt: new Date(),
			setIdIfMissing: jest.fn()
		} as unknown as StrollReportEntity;
		reportsRepository.find.mockResolvedValue([report]);
		strollsRepository.find.mockResolvedValue([stroll]);
		usersRepository.find.mockResolvedValue([{ id: stroll.authorId, username: 'author', email: 'author@example.com' }]);

		const result = await service.listAllForAdmin(admin);

		expect(result).toEqual([
			{
				report,
				stroll: { id: stroll.id, name: stroll.name, activeStatus: stroll.activeStatus },
				author: { id: stroll.authorId, username: 'author', email: 'author@example.com' }
			}
		]);
	});
});
