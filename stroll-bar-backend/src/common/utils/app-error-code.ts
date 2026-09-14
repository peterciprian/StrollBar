/** Machine-readable `error.code` values the frontend branches on. Mirrored in the Angular app. */
export const AppErrorCode = {
	EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
	STROLL_PUBLICITY_NOT_ALLOWED: 'STROLL_PUBLICITY_NOT_ALLOWED',
	STROLL_QUOTA_REACHED: 'STROLL_QUOTA_REACHED',
	PURCHASE_QUOTA_REACHED: 'PURCHASE_QUOTA_REACHED'
} as const;

export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];
