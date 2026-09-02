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

	async listAll(currentUser: AuthenticatedUser) {
		this.assertAdmin(currentUser);

		const users = await this.usersRepository.find({ order: { createdAt: 'DESC' } });

		return users.map((user) => this.toUserResponse(user));
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

		return this.toUserResponse(savedUser);
	}

	async updateRole(userId: string, role: UserRole, currentUser: AuthenticatedUser, ipAddress?: string) {
		this.assertAdmin(currentUser);

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

		return this.toUserResponse(savedUser);
	}

	private assertAdmin(currentUser: AuthenticatedUser): void {
		if (currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('Administrator access required.');
		}
	}

	private toUserResponse(user: UserEntity) {
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			profileImageUrl: user.profileImageUrl ?? null,
			isActive: user.isActive,
			role: user.role,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		};
	}
}
