export enum UserRole {
	SIMPLE = 'simple',
	PREMIUM = 'premium',
	CREATOR = 'creator',
	ADMIN = 'admin'
}

export interface UserRoleOption {
	value: UserRole;
	labelKey: string;
}

const roleEntries = Object.entries(UserRole) as [keyof typeof UserRole, UserRole][];

// Enum keys drive the translation keys, enum values are the API payload values.
export const USER_ROLE_OPTIONS: UserRoleOption[] = roleEntries.map(([key, value]) => ({
	value,
	labelKey: `SCREENS.ADMIN_USER_LIST.ROLE_${key}`
}));

export const USER_ROLE_LABEL_KEYS: Record<string, string> = Object.fromEntries(USER_ROLE_OPTIONS.map((option) => [option.value, option.labelKey]));
