import { UserRole } from '../../modules/users/entities/user.entity';

/** `private` covers every non-public stroll, i.e. both PRIVATE and UNLISTED. */
export interface RoleQuota {
	public: number;
	private: number;
}

export const STROLL_CREATION_QUOTAS: Record<UserRole, RoleQuota> = {
	[UserRole.SIMPLE]: { public: 3, private: 0 },
	[UserRole.CREATOR]: { public: 20, private: 3 },
	[UserRole.PREMIUM]: { public: Number.POSITIVE_INFINITY, private: Number.POSITIVE_INFINITY },
	[UserRole.ADMIN]: { public: Number.POSITIVE_INFINITY, private: Number.POSITIVE_INFINITY }
};

export const STROLL_PURCHASE_QUOTAS: Record<UserRole, RoleQuota> = {
	[UserRole.SIMPLE]: { public: 10, private: Number.POSITIVE_INFINITY },
	[UserRole.CREATOR]: { public: Number.POSITIVE_INFINITY, private: Number.POSITIVE_INFINITY },
	[UserRole.PREMIUM]: { public: Number.POSITIVE_INFINITY, private: Number.POSITIVE_INFINITY },
	[UserRole.ADMIN]: { public: Number.POSITIVE_INFINITY, private: Number.POSITIVE_INFINITY }
};

export function resolveQuota(quotas: Record<UserRole, RoleQuota>, role: UserRole): RoleQuota {
	return quotas[role] ?? quotas[UserRole.SIMPLE];
}
