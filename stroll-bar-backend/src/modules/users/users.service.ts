import { ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdventureProgressStatus, AdventureEntity } from '../adventures/entities/adventure.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity, UserRole } from './entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../../common/audit.entity';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>,
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>,
		@InjectRepository(AdventureEntity)
		private readonly adventuresRepository: Repository<AdventureEntity>,
		@Optional() private readonly auditService?: AuditService
	) {}

	async getPublicProfile(userId: string) {
		const user = await this.usersRepository.findOne({ where: { id: userId } });

		if (!user) {
			throw new NotFoundException(`User ${userId} was not found.`);
		}

		const publishedStrolls = await this.strollsRepository.find({
			where: {
				authorId: userId,
				activeStatus: StrollActiveStatus.PUBLISHED,
				publicityFlag: StrollPublicityFlag.PUBLIC
			},
			select: { id: true }
		});

		const strollIds = publishedStrolls.map((stroll) => stroll.id);
		const unlockCount = strollIds.length ? await this.adventuresRepository.count({ where: { strollId: In(strollIds) } }) : 0;
		const completionCount = strollIds.length
			? await this.adventuresRepository.count({
					where: {
						strollId: In(strollIds),
						progressStatus: AdventureProgressStatus.COMPLETED
					}
				})
			: 0;

		return {
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				profileImageUrl: user.profileImageUrl ?? null
			},
			stats: {
				publishedStrolls: publishedStrolls.length,
				unlockCount,
				completionCount
			}
		};
	}

	async updateMe(userId: string, dto: UpdateUserDto) {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found.');
		}

		if (dto.username && dto.username !== user.username) {
			const existingUsername = await this.usersRepository.findOne({ where: { username: dto.username } });
			if (existingUsername) {
				throw new ConflictException('Username is already taken.');
			}
			user.username = dto.username;
		}

		if (dto.profileImageUrl !== undefined) {
			user.profileImageUrl = dto.profileImageUrl;
		}

		const savedUser = await this.usersRepository.save(user);

		return {
			id: savedUser.id,
			username: savedUser.username,
			email: savedUser.email,
			profileImageUrl: savedUser.profileImageUrl ?? null,
			isActive: savedUser.isActive,
			role: savedUser.role,
			emailVerified: savedUser.emailVerified,
			createdAt: savedUser.createdAt,
			updatedAt: savedUser.updatedAt
		};
	}

	async updateRole(userId: string, role: UserRole, currentUser: AuthenticatedUser, ipAddress?: string) {
		if (currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('Only administrators can assign user roles.');
		}

		const user = await this.usersRepository.findOne({ where: { id: userId } });

		if (!user) {
			throw new NotFoundException(`User ${userId} was not found.`);
		}

		user.role = role;
		const savedUser = await this.usersRepository.save(user);
		await this.auditService?.record({
			action: AuditAction.ROLE_CHANGE,
			userId: savedUser.id,
			actorUserId: currentUser.userId,
			success: true,
			ipAddress,
			metadata: { role }
		});

		return {
			id: savedUser.id,
			username: savedUser.username,
			email: savedUser.email,
			profileImageUrl: savedUser.profileImageUrl ?? null,
			isActive: savedUser.isActive,
			role: savedUser.role,
			emailVerified: savedUser.emailVerified,
			createdAt: savedUser.createdAt,
			updatedAt: savedUser.updatedAt
		};
	}
}
