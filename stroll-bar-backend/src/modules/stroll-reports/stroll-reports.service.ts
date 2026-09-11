import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { CreateStrollReportDto } from './dto/create-stroll-report.dto';
import { StrollReportEntity } from './entities/stroll-report.entity';
import { StrollActiveStatus, StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

// If this many reports land for the same stroll within the time window, it's auto-suspended pending review.
const AUTO_SUSPEND_REPORT_THRESHOLD = 5;
const AUTO_SUSPEND_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class StrollReportsService {
	constructor(
		@InjectRepository(StrollReportEntity)
		private readonly reportsRepository: Repository<StrollReportEntity>,
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>,
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>
	) {}

	async create(strollId: string, dto: CreateStrollReportDto, currentUser: AuthenticatedUser): Promise<StrollReportEntity> {
		const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });
		if (!stroll) {
			throw new NotFoundException(`Stroll ${strollId} was not found.`);
		}

		const report = this.reportsRepository.create({
			strollId,
			reporterUserId: currentUser.userId,
			message: dto.message.trim()
		});
		const savedReport = await this.reportsRepository.save(report);

		if (!stroll.reported) {
			stroll.reported = true;
			await this.strollsRepository.save(stroll);
		}

		await this.autoSuspendIfNeeded(stroll);

		return savedReport;
	}

	async listAllForAdmin(currentUser: AuthenticatedUser) {
		this.assertAdmin(currentUser);

		const reports = await this.reportsRepository.find({ order: { createdAt: 'DESC' } });
		if (!reports.length) {
			return [];
		}

		const strollIds = [...new Set(reports.map((report) => report.strollId))];
		const strolls = await this.strollsRepository.find({ where: { id: In(strollIds) } });
		const strollsById = new Map(strolls.map((stroll) => [stroll.id, stroll]));

		const authorIds = [...new Set(strolls.map((stroll) => stroll.authorId))];
		const authors = authorIds.length
			? await this.usersRepository.find({ where: { id: In(authorIds) }, select: { id: true, username: true, email: true } })
			: [];
		const authorsById = new Map(authors.map((author) => [author.id, author]));

		return reports.map((report) => {
			const stroll = strollsById.get(report.strollId) ?? null;
			const author = stroll ? (authorsById.get(stroll.authorId) ?? null) : null;
			return {
				report,
				stroll: stroll ? { id: stroll.id, name: stroll.name, activeStatus: stroll.activeStatus } : null,
				author: author ? { id: author.id, username: author.username, email: author.email } : null
			};
		});
	}

	private async autoSuspendIfNeeded(stroll: StrollEntity): Promise<void> {
		if (stroll.activeStatus === StrollActiveStatus.SUSPENDED) {
			return;
		}

		const recentReportCount = await this.reportsRepository.count({
			where: { strollId: stroll.id, createdAt: MoreThan(new Date(Date.now() - AUTO_SUSPEND_WINDOW_MS)) }
		});

		if (recentReportCount >= AUTO_SUSPEND_REPORT_THRESHOLD) {
			stroll.activeStatus = StrollActiveStatus.SUSPENDED;
			await this.strollsRepository.save(stroll);
		}
	}

	private assertAdmin(currentUser: AuthenticatedUser): void {
		if (currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('Administrator access required.');
		}
	}
}
