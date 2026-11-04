import { PaidGrantEntity } from './entities/paid-grant.entity';

// Account surfaces must not expose administrator reasons, actors, or full grant history.
export function ownPaidGrantSummary(grant: PaidGrantEntity) {
	return {
		id: grant.id,
		plan: grant.plan,
		status: grant.status,
		startsAt: grant.startsAt.toISOString(),
		expiresAt: grant.expiresAt.toISOString(),
		cancelledAt: grant.cancelledAt?.toISOString() ?? null
	};
}
