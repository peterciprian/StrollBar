import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_ENDPOINT } from '../core.module';
import {
	Achievement,
	AdventureDetailResponse,
	AuthResponse,
	CreateAchievementRequest,
	CreateStageRequest,
	CreateStrollRequest,
	DeleteStrollResponse,
	ListStrollsQuery,
	LoginRequest,
	LogoutRequest,
	MessageResponse,
	NavigateAdventureRequest,
	PasswordResetRequestResponse,
	PublicUserProfile,
	RefreshRequest,
	RegisterRequest,
	ReorderStagesRequest,
	ReorderStagesResponse,
	RequestPasswordResetRequest,
	ResetPasswordRequest,
	SocialAuthProvider,
	SocialAuthStartResponse,
	Stage,
	Stroll,
	StrollDetailResponse,
	StrollListResponse,
	SubmitStageAnswerRequest,
	SubmitStageAnswerResponse,
	UnlockStrollRequest,
	UpdateStrollRequest,
	User,
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

	// ─── Users ─────────────────────────────────────────────────────────────────

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

		return this.http.get<StrollListResponse>(`${this.baseUrl}/strolls`, { params });
	}

	createStroll(body: CreateStrollRequest) {
		return this.http.post<Stroll>(`${this.baseUrl}/strolls`, body);
	}

	getStroll(strollId: string) {
		return this.http.get<StrollDetailResponse>(`${this.baseUrl}/strolls/${strollId}`);
	}

	updateStroll(strollId: string, body: UpdateStrollRequest) {
		return this.http.patch<Stroll>(`${this.baseUrl}/strolls/${strollId}`, body);
	}

	deleteStroll(strollId: string) {
		return this.http.delete<DeleteStrollResponse>(`${this.baseUrl}/strolls/${strollId}`);
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

	// ─── Adventures ────────────────────────────────────────────────────────────

	unlockStroll(body: UnlockStrollRequest) {
		return this.http.post<Adventure>(`${this.baseUrl}/adventures/unlock`, body);
	}

	startAdventure(adventureId: string) {
		return this.http.post<Adventure>(`${this.baseUrl}/adventures/${adventureId}/start`, {});
	}

	getAdventure(adventureId: string) {
		return this.http.get<AdventureDetailResponse>(`${this.baseUrl}/adventures/${adventureId}`);
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
}
