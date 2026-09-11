import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_ENDPOINT } from './api-endpoint.token';
import {
	AbortMultipartUploadRequest,
	Achievement,
	AdminAdventureEntry,
	AdminStrollReportEntry,
	AdventureDetailResponse,
	AdventureResultResponse,
	AdventureResultWithStroll,
	AnalyticsSummaryResponse,
	AssignAdventureRequest,
	AuthResponse,
	BadgeCatalogEntry,
	BadgeDefinition,
	BulkImportStrollRequest,
	BulkImportStrollResponse,
	BrowseStrollsResponse,
	ChangePasswordRequest,
	CompleteMultipartUploadRequest,
	CompleteMultipartUploadResponse,
	CreateAchievementRequest,
	CreateBadgeDefinitionRequest,
	CreatePresignedUploadRequest,
	CreateStageRequest,
	CreateStrollRequest,
	CreateStrollReportRequest,
	CreateStrollReviewRequest,
	DeleteStageResponse,
	DeleteStrollResponse,
	InitiateMultipartUploadResponse,
	ListStrollsQuery,
	LoginRequest,
	LogoutRequest,
	MessageResponse,
	MyReviewListEntry,
	NavigateAdventureRequest,
	PasswordResetRequestResponse,
	PresignedUploadResponse,
	PublicUserProfile,
	RefreshRequest,
	RegisterRequest,
	ReorderStagesRequest,
	ReorderStagesResponse,
	RequestPasswordResetRequest,
	ResendVerificationResponse,
	ResetPasswordRequest,
	SocialAuthProvider,
	SocialAuthStartResponse,
	Stage,
	Stroll,
	StrollDetailResponse,
	StrollListResponse,
	StrollReport,
	StrollReview,
	StrollReviewListResponse,
	SubmitStageAnswerRequest,
	SubmitStageAnswerResponse,
	UnlockStrollRequest,
	UpdateBadgeDefinitionRequest,
	UpdateStageRequest,
	UpdateStrollRequest,
	UpdateUserRequest,
	UpdateUserRoleRequest,
	User,
	VerifyEmailRequest,
	Adventure
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = inject(API_ENDPOINT);

	// ─── Auth ──────────────────────────────────────────────────────────────────

	register(body: RegisterRequest) {
		return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, body);
	}

	login(body: LoginRequest) {
		return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, body);
	}

	getSocialAuthStartUrl(provider: SocialAuthProvider, redirectUri: string) {
		const params = new HttpParams().set('redirectUri', redirectUri);
		return this.http.get<SocialAuthStartResponse>(`${this.baseUrl}/auth/social/${provider}/start-url`, { params });
	}

	refresh(body: RefreshRequest) {
		return this.http.post<AuthResponse>(`${this.baseUrl}/auth/refresh`, body);
	}

	logout(body: LogoutRequest) {
		return this.http.post<MessageResponse>(`${this.baseUrl}/auth/logout`, body);
	}

	me() {
		return this.http.get<User>(`${this.baseUrl}/auth/me`);
	}

	requestPasswordReset(body: RequestPasswordResetRequest) {
		return this.http.post<PasswordResetRequestResponse>(`${this.baseUrl}/auth/password-reset/request`, body);
	}

	resetPassword(body: ResetPasswordRequest) {
		return this.http.post<MessageResponse>(`${this.baseUrl}/auth/password-reset/confirm`, body);
	}

	changePassword(body: ChangePasswordRequest) {
		return this.http.post<MessageResponse>(`${this.baseUrl}/auth/change-password`, body);
	}

	verifyEmail(body: VerifyEmailRequest) {
		return this.http.post<MessageResponse>(`${this.baseUrl}/auth/verify-email`, body);
	}

	resendVerificationEmail() {
		return this.http.post<ResendVerificationResponse>(`${this.baseUrl}/auth/resend-verification`, {});
	}

	// ─── Users ─────────────────────────────────────────────────────────────────

	listUsers() {
		return this.http.get<User[]>(`${this.baseUrl}/users`);
	}

	updateMe(body: UpdateUserRequest) {
		return this.http.patch<User>(`${this.baseUrl}/users/me`, body);
	}

	updateUserRole(userId: string, body: UpdateUserRoleRequest) {
		return this.http.patch<User>(`${this.baseUrl}/users/${userId}/role`, body);
	}

	getPublicProfile(userId: string) {
		return this.http.get<PublicUserProfile>(`${this.baseUrl}/users/${userId}`);
	}

	// ─── Strolls ───────────────────────────────────────────────────────────────

	listStrolls(query: ListStrollsQuery = {}) {
		let params = new HttpParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				params = params.set(key, String(value));
			}
		});

		return this.http.get<BrowseStrollsResponse>(`${this.baseUrl}/strolls`, { params });
	}

	listOwnedStrolls(query: ListStrollsQuery = {}) {
		let params = new HttpParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				params = params.set(key, String(value));
			}
		});

		return this.http.get<StrollListResponse>(`${this.baseUrl}/strolls/mine`, { params });
	}

	createStroll(body: CreateStrollRequest) {
		return this.http.post<Stroll>(`${this.baseUrl}/strolls`, body);
	}

	getStroll(strollId: string) {
		return this.http.get<StrollDetailResponse>(`${this.baseUrl}/strolls/${strollId}`);
	}

	getOwnedStroll(strollId: string) {
		return this.http.get<StrollDetailResponse>(`${this.baseUrl}/strolls/mine/${strollId}`);
	}

	bulkImportStroll(body: BulkImportStrollRequest) {
		return this.http.post<BulkImportStrollResponse>(`${this.baseUrl}/strolls/bulk-import`, body);
	}

	updateStroll(strollId: string, body: UpdateStrollRequest) {
		return this.http.patch<Stroll>(`${this.baseUrl}/strolls/${strollId}`, body);
	}

	deleteStroll(strollId: string) {
		return this.http.delete<DeleteStrollResponse>(`${this.baseUrl}/strolls/${strollId}`);
	}

	// ─── Stroll reviews ───────────────────────────────────────────────────

	listStrollReviews(strollId: string) {
		return this.http.get<StrollReviewListResponse>(`${this.baseUrl}/strolls/${strollId}/reviews`);
	}

	getMyStrollReview(strollId: string) {
		return this.http.get<StrollReview | null>(`${this.baseUrl}/strolls/${strollId}/reviews/mine`);
	}

	submitStrollReview(strollId: string, body: CreateStrollReviewRequest) {
		return this.http.post<StrollReview>(`${this.baseUrl}/strolls/${strollId}/reviews`, body);
	}

	listMyReviews() {
		return this.http.get<MyReviewListEntry[]>(`${this.baseUrl}/reviews/mine`);
	}

	deleteMyReview(reviewId: string) {
		return this.http.delete<{ id: string; deleted: boolean }>(`${this.baseUrl}/reviews/${reviewId}`);
	}

	// ─── Stroll reports ────────────────────────────────────────────────────

	reportStroll(strollId: string, body: CreateStrollReportRequest) {
		return this.http.post<StrollReport>(`${this.baseUrl}/strolls/${strollId}/reports`, body);
	}

	listStrollReports() {
		return this.http.get<AdminStrollReportEntry[]>(`${this.baseUrl}/stroll-reports`);
	}

	// ─── Stages ────────────────────────────────────────────────────────────────

	listStages(strollId: string) {
		return this.http.get<Stage[]>(`${this.baseUrl}/strolls/${strollId}/stages`);
	}

	createStage(strollId: string, body: CreateStageRequest) {
		return this.http.post<Stage>(`${this.baseUrl}/strolls/${strollId}/stages`, body);
	}

	reorderStages(strollId: string, body: ReorderStagesRequest) {
		return this.http.patch<ReorderStagesResponse>(`${this.baseUrl}/strolls/${strollId}/stages/reorder`, body);
	}
	updateStage(strollId: string, stageId: string, body: UpdateStageRequest) {
		return this.http.patch<Stage>(`${this.baseUrl}/strolls/${strollId}/stages/${stageId}`, body);
	}

	deleteStage(strollId: string, stageId: string) {
		return this.http.delete<DeleteStageResponse>(`${this.baseUrl}/strolls/${strollId}/stages/${stageId}`);
	}
	// ─── Adventures ────────────────────────────────────────────────────────────

	unlockStroll(body: UnlockStrollRequest) {
		return this.http.post<Adventure>(`${this.baseUrl}/adventures/unlock`, body);
	}

	listAdventures() {
		return this.http.get<AdventureDetailResponse[]>(`${this.baseUrl}/adventures`);
	}

	startAdventure(adventureId: string) {
		return this.http.post<Adventure>(`${this.baseUrl}/adventures/${adventureId}/start`, {});
	}

	getAdventure(adventureId: string) {
		return this.http.get<AdventureDetailResponse>(`${this.baseUrl}/adventures/${adventureId}`);
	}

	// ─── Adventures (admin) ────────────────────────────────────────────────────

	listAllAdventuresAdmin() {
		return this.http.get<AdminAdventureEntry[]>(`${this.baseUrl}/adventures/admin`);
	}

	assignAdventure(body: AssignAdventureRequest) {
		return this.http.post<Adventure>(`${this.baseUrl}/adventures/admin/assign`, body);
	}

	revokeAdventure(adventureId: string) {
		return this.http.delete<Adventure>(`${this.baseUrl}/adventures/admin/${adventureId}`);
	}

	getAdventureResult(adventureId: string) {
		return this.http.get<AdventureResultResponse>(`${this.baseUrl}/adventures/${adventureId}/result`);
	}

	submitStageAnswer(adventureId: string, stageId: string, body: SubmitStageAnswerRequest) {
		return this.http.post<SubmitStageAnswerResponse>(`${this.baseUrl}/adventures/${adventureId}/stages/${stageId}/answer`, body);
	}

	navigateAdventure(adventureId: string, body: NavigateAdventureRequest) {
		return this.http.post<AdventureDetailResponse>(`${this.baseUrl}/adventures/${adventureId}/navigate`, body);
	}

	// ─── Achievements ──────────────────────────────────────────────────────────

	createAchievement(body: CreateAchievementRequest) {
		return this.http.post<Achievement>(`${this.baseUrl}/achievements`, body);
	}

	listAchievements() {
		return this.http.get<Achievement[]>(`${this.baseUrl}/achievements`);
	}

	getAchievement(achievementId: string) {
		return this.http.get<Achievement>(`${this.baseUrl}/achievements/${achievementId}`);
	}

	listAdventureResults() {
		return this.http.get<AdventureResultWithStroll[]>(`${this.baseUrl}/achievements/results`);
	}

	// ─── Analytics ──────────────────────────────────────────────────────────────

	getAnalyticsSummary() {
		return this.http.get<AnalyticsSummaryResponse>(`${this.baseUrl}/analytics/summary`);
	}

	// ─── Badges ────────────────────────────────────────────────────────────────────

	getBadgeCatalog() {
		return this.http.get<BadgeCatalogEntry[]>(`${this.baseUrl}/badges`);
	}

	listBadgeDefinitionsAdmin() {
		return this.http.get<BadgeDefinition[]>(`${this.baseUrl}/badges/admin/definitions`);
	}

	createBadgeDefinition(body: CreateBadgeDefinitionRequest) {
		return this.http.post<BadgeDefinition>(`${this.baseUrl}/badges/admin/definitions`, body);
	}

	updateBadgeDefinition(id: string, body: UpdateBadgeDefinitionRequest) {
		return this.http.patch<BadgeDefinition>(`${this.baseUrl}/badges/admin/definitions/${id}`, body);
	}

	deleteBadgeDefinition(id: string) {
		return this.http.delete<{ id: string; deleted: boolean }>(`${this.baseUrl}/badges/admin/definitions/${id}`);
	}

	// ─── Media ────────────────────────────────────────────────────────────────────

	presignUpload(body: CreatePresignedUploadRequest) {
		return this.http.post<PresignedUploadResponse>(`${this.baseUrl}/media/presign-upload`, body);
	}

	initiateMultipartUpload(body: CreatePresignedUploadRequest) {
		return this.http.post<InitiateMultipartUploadResponse>(`${this.baseUrl}/media/multipart/initiate`, body);
	}

	completeMultipartUpload(body: CompleteMultipartUploadRequest) {
		return this.http.post<CompleteMultipartUploadResponse>(`${this.baseUrl}/media/multipart/complete`, body);
	}

	abortMultipartUpload(body: AbortMultipartUploadRequest) {
		return this.http.post<CompleteMultipartUploadResponse>(`${this.baseUrl}/media/multipart/abort`, body);
	}
}
