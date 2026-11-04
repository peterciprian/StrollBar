import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { resolveQuota, RoleQuota, STROLL_CREATION_QUOTAS, STROLL_PURCHASE_QUOTAS } from '../../common/utils/user-quotas';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { nextPlanTransition } from './effective-role.service';
import { PaidGrantEntity, PaidGrantStatus } from './entities/paid-grant.entity';
import { UserEntity, UserRole } from './entities/user.entity';
import { ownPaidGrantSummary } from './paid-grant-summary';

function externalLimits(quota: RoleQuota): { public: number | null; private: number | null } {
	return {
		public: Number.isFinite(quota.public) ? quota.public : null,
		private: Number.isFinite(quota.private) ? quota.private : null
	};
}

@Injectable()
export class UserEntitlementService {
	constructor(
		@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
		@InjectRepository(PaidGrantEntity) private readonly grants: Repository<PaidGrantEntity>,
		@InjectRepository(StrollEntity) private readonly strolls: Repository<StrollEntity>,
		@InjectRepository(AdventureEntity) private readonly adventures: Repository<AdventureEntity>
	) {}

	async getForUser(userId: string) {
		const user = await this.users.findOne({ where: { id: userId, isActive: true } });
		if (!user) throw new NotFoundException('No active user found.');

		const now = new Date();
		const grants = await this.grants.find({
			where: { userId, status: In([PaidGrantStatus.ACTIVE, PaidGrantStatus.CANCELLED]) }
		});
		const transition = nextPlanTransition(user.role, grants, now);
		const plan = transition.plan;
		const paidThroughAt = plan === UserRole.ADMIN || plan === UserRole.SIMPLE ? null : (transition.at?.toISOString() ?? null);

		const [publicCreated, privateCreated, publicPurchased, privatePurchased] = await Promise.all([
			this.strolls.count({ where: { authorId: userId, publicityFlag: StrollPublicityFlag.PUBLIC } }),
			this.strolls.count({ where: { authorId: userId, publicityFlag: In([StrollPublicityFlag.PRIVATE, StrollPublicityFlag.UNLISTED]) } }),
			this.countPurchases(userId, StrollPublicityFlag.PUBLIC),
			this.countPurchases(userId, StrollPublicityFlag.PRIVATE)
		]);

		return {
			plan,
			paidThroughAt,
			fallbackPlan: paidThroughAt ? transition.nextPlan : null,
			paidGrants: grants.filter((grant) => grant.expiresAt > now).map(ownPaidGrantSummary),
			creationLimits: externalLimits(resolveQuota(STROLL_CREATION_QUOTAS, plan)),
			creationUsage: { public: publicCreated, private: privateCreated },
			purchaseLimits: externalLimits(resolveQuota(STROLL_PURCHASE_QUOTAS, plan)),
			purchaseUsage: { public: publicPurchased, private: privatePurchased }
		};
	}

	private async countPurchases(userId: string, publicityFlag: StrollPublicityFlag): Promise<number> {
		return this.adventures
			.createQueryBuilder('adventure')
			.innerJoin(StrollEntity, 'stroll', 'stroll.id = adventure.strollId')
			.where('adventure.ownerUserId = :userId', { userId })
			.andWhere('adventure.progressStatus != :revoked', { revoked: AdventureProgressStatus.REVOKED })
			.andWhere(publicityFlag === StrollPublicityFlag.PUBLIC ? 'stroll.publicityFlag = :publicFlag' : 'stroll.publicityFlag != :publicFlag', {
				publicFlag: StrollPublicityFlag.PUBLIC
			})
			.getCount();
	}
}
