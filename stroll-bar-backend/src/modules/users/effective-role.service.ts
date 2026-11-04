import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaidGrantEntity, PaidGrantStatus, PaidPlan } from './entities/paid-grant.entity';
import { UserEntity, UserRole } from './entities/user.entity';

export function effectiveRole(role: UserRole, grants: PaidGrantEntity[], now: Date): UserRole {
	// ADMIN is an independent assignment; legacy paid user.role values are not entitlements.
	if (role === UserRole.ADMIN) return UserRole.ADMIN;
	const active = grants.filter(
		(grant) =>
			(grant.status === PaidGrantStatus.ACTIVE || grant.status === PaidGrantStatus.CANCELLED) &&
			grant.startsAt.getTime() <= now.getTime() &&
			now.getTime() < grant.expiresAt.getTime()
	);
	if (active.some((grant) => grant.plan === PaidPlan.PREMIUM)) return UserRole.PREMIUM;
	if (active.some((grant) => grant.plan === PaidPlan.CREATOR)) return UserRole.CREATOR;
	return UserRole.SIMPLE;
}

export function nextPlanTransition(role: UserRole, grants: PaidGrantEntity[], now: Date) {
	const plan = effectiveRole(role, grants, now);
	const boundaries = [...new Set(grants.flatMap((grant) => [grant.startsAt.getTime(), grant.expiresAt.getTime()]))]
		.filter((time) => time > now.getTime())
		.sort((a, b) => a - b);
	for (const time of boundaries) {
		const nextPlan = effectiveRole(role, grants, new Date(time));
		if (nextPlan !== plan) return { plan, at: new Date(time), nextPlan };
	}
	return { plan, at: null, nextPlan: null };
}

@Injectable()
export class EffectiveRoleService {
	private readonly logger = new Logger(EffectiveRoleService.name);

	constructor(@InjectRepository(PaidGrantEntity) private readonly grants: Repository<PaidGrantEntity>) {}

	async resolve(user: Pick<UserEntity, 'id' | 'role'>): Promise<UserRole> {
		if (user.role === UserRole.ADMIN) return UserRole.ADMIN;
		// Never cache authorization: even a cancelled grant expires without a reconciliation job.
		const grants = await this.grants.find({
			where: { userId: user.id, status: In([PaidGrantStatus.ACTIVE, PaidGrantStatus.CANCELLED]) }
		});
		const now = new Date();
		const role = effectiveRole(user.role, grants, now);
		this.logger.debug({ event: 'effective_role_resolved', userId: user.id, role, evaluatedAt: now.toISOString() });
		return role;
	}
}
