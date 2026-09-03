import { UserRole } from '../models/user-role.enum';

export type StrollActiveStatus = 'draft' | 'published' | 'archived';
export type StrollPublicityFlag = 'public' | 'unlisted' | 'private';
export type AdventureProgressStatus = 'purchased' | 'in_progress' | 'completed' | 'abandoned';

export { UserRole };

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
	id: string;
	username: string;
	email: string;
	profileImageUrl?: string | null;
	isActive: boolean;
	role: UserRole;
	emailVerified: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface UpdateUserRequest {
	username?: string;
	profileImageUrl?: string;
}

export interface UpdateUserRoleRequest {
	role: UserRole;
}

/** Reduced shape returned by GET /v1/users/:userId */
export interface PublicUserProfileUser {
	id: string;
	username: string;
	email: string;
	profileImageUrl?: string | null;
}

export interface PublicUserProfile {
	user: PublicUserProfileUser;
	stats: {
		publishedStrolls: number;
		unlockCount: number;
		completionCount: number;
	};
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
	username: string;
	email: string;
	password: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export type SocialAuthProvider = 'apple' | 'google' | 'facebook' | 'twitter';

export interface SocialAuthStartResponse {
	url: string;
}

export interface AuthResponse {
	accessToken: string;
	refreshToken: string;
	user: User;
	verificationToken?: string;
}

export interface RefreshRequest {
	refreshToken: string;
}

export interface LogoutRequest {
	refreshToken?: string;
}

export interface RequestPasswordResetRequest {
	email: string;
}

export interface PasswordResetRequestResponse {
	message: string;
	resetToken?: string;
}

export interface ResetPasswordRequest {
	resetToken: string;
	newPassword: string;
}

export interface ChangePasswordRequest {
	currentPassword: string;
	newPassword: string;
}

export interface VerifyEmailRequest {
	token: string;
}

export interface ResendVerificationResponse {
	message: string;
	verificationToken?: string;
}

export interface MessageResponse {
	message: string;
}

// ─── Strolls ──────────────────────────────────────────────────────────────────

export interface MediaUrls {
	imageUrls?: string[];
	videoUrls?: string[];
}

export interface Stroll {
	id: string;
	name: string;
	authorId: string;
	activeStatus: StrollActiveStatus;
	labels: string[];
	description: string;
	proposerText?: string | null;
	mediaUrls?: MediaUrls;
	publicityFlag: StrollPublicityFlag;
	stageCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface StrollSummary {
	id: string;
	name: string;
	authorId: string;
	labels: string[];
	description: string;
	mediaUrls?: MediaUrls | null;
	publicityFlag: StrollPublicityFlag;
	stageCount: number;
}

export interface ListStrollsQuery {
	search?: string;
	labels?: string;
	authorId?: string;
	city?: string;
	sortBy?: 'newest' | 'most_used' | 'best_rated';
	page?: number;
	limit?: number;
}

export interface StrollListResponse {
	items: Stroll[];
	page: number;
	limit: number;
	total: number;
}

export interface BrowseStrollsResponse {
	items: StrollSummary[];
	page: number;
	limit: number;
	total: number;
}

export interface CreateStrollRequest {
	name: string;
	description: string;
	proposerText?: string;
	labels?: string[];
	imageUrls?: string[];
	videoUrls?: string[];
	activeStatus?: StrollActiveStatus;
	publicityFlag?: StrollPublicityFlag;
}

export interface UpdateStrollRequest extends Partial<CreateStrollRequest> {}

export interface DeleteStrollResponse {
	id: string;
	deleted: boolean;
}

// ─── Stages ───────────────────────────────────────────────────────────────────

export interface Stage {
	id: string;
	strollId: string;
	orderIndex: number;
	name: string;
	description: string;
	notes?: string | null;
	imageUrls?: string[];
	videoUrls?: string[];
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface StrollDetailResponse {
	stroll: Stroll;
	stages: Stage[];
}

export interface BulkImportStrollRequest {
	stroll: Stroll;
	stages: Stage[];
}

export interface BulkImportStrollResponse {
	stroll: Stroll;
	stages: Stage[];
}

export interface CreateStageRequest {
	orderIndex: number;
	name: string;
	description: string;
	notes?: string;
	imageUrls?: string[];
	videoUrls?: string[];
	address?: string;
	latitude?: number;
	longitude?: number;
	riddleAnswer?: string;
}

export interface ReorderStagesRequest {
	items: Array<{
		stageId: string;
		orderIndex: number;
	}>;
}

export interface ReorderStagesResponse {
	strollId: string;
	reordered: number;
}

export interface UpdateStageRequest extends Partial<CreateStageRequest> {}

export interface DeleteStageResponse {
	id: string;
	deleted: boolean;
}

// ─── Adventures ───────────────────────────────────────────────────────────────

export interface Adventure {
	id: string;
	ownerUserId: string;
	strollId: string;
	purchaseTime: string;
	startDateTime?: string | null;
	completionDateTime?: string | null;
	progressStatus: AdventureProgressStatus;
	currentStageIndex: number;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface UnlockStrollRequest {
	strollId: string;
}

export interface SubmitStageAnswerRequest {
	answer: string;
}

export interface SubmitStageAnswerResponse {
	isCorrect: boolean;
	adventure: Adventure;
	stageId: string;
}

export interface AdventureDetailResponse {
	adventure: Adventure;
	stroll: Stroll | null;
	currentStage: Stage | null;
}

export type AdventureNavigateDirection = 'next' | 'previous';

export interface NavigateAdventureRequest {
	direction: AdventureNavigateDirection;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface Achievement {
	id: string;
	userId: string;
	strollId: string;
	score: number;
	timeSeconds: number;
	hintsUsed: number;
	completed: boolean;
	completedAt?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateAchievementRequest {
	strollId: string;
	score?: number;
	timeSeconds?: number;
	hintsUsed?: number;
	completed?: boolean;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export type MediaUploadPurpose = 'stroll' | 'stage' | 'profile';

export interface CreatePresignedUploadRequest {
	fileName: string;
	contentType: string;
	sizeBytes: number;
	purpose: MediaUploadPurpose;
	entityId?: string;
}

export interface PresignedUploadResponse {
	assetId: string;
	objectKey: string;
	uploadUrl: string;
	publicUrl: string;
	method: 'PUT';
	expiresInSeconds: number;
	headers: Record<string, string>;
}

export interface InitiateMultipartUploadResponse {
	assetId: string;
	uploadId: string;
	objectKey: string;
	publicUrl: string;
	partSizeBytes: number;
	partCount: number;
	parts: Array<{ partNumber: number; uploadUrl: string }>;
	expiresInSeconds: number;
}

export interface CompleteMultipartUploadRequest {
	assetId: string;
	uploadId: string;
	parts: Array<{ partNumber: number; etag: string }>;
}

export interface CompleteMultipartUploadResponse {
	message: string;
}

export interface AbortMultipartUploadRequest {
	assetId: string;
	uploadId: string;
}
