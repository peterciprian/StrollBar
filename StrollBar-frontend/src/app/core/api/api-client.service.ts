import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Adventure,
  AdventureDetailResponse,
  AuthResponse,
  CreateStageRequest,
  CreateStrollRequest,
  ListStrollsQuery,
  LoginRequest,
  PublicUserProfile,
  RegisterRequest,
  ReorderStagesRequest,
  Stage,
  Stroll,
  StrollDetailResponse,
  StrollListResponse,
  SubmitStageAnswerRequest,
  SubmitStageAnswerResponse,
  UnlockStrollRequest,
  UpdateStrollRequest,
  User,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1';

  register(body: RegisterRequest) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, body);
  }

  login(body: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, body);
  }

  me() {
    return this.http.get<User>(`${this.baseUrl}/auth/me`);
  }

  getPublicProfile(userId: string) {
    return this.http.get<PublicUserProfile>(`${this.baseUrl}/users/${userId}`);
  }

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
    return this.http.delete<void>(`${this.baseUrl}/strolls/${strollId}`);
  }

  listStages(strollId: string) {
    return this.http.get<Stage[]>(`${this.baseUrl}/strolls/${strollId}/stages`);
  }

  createStage(strollId: string, body: CreateStageRequest) {
    return this.http.post<Stage>(`${this.baseUrl}/strolls/${strollId}/stages`, body);
  }

  reorderStages(strollId: string, body: ReorderStagesRequest) {
    return this.http.patch<void>(`${this.baseUrl}/strolls/${strollId}/stages/reorder`, body);
  }

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
    return this.http.post<SubmitStageAnswerResponse>(
      `${this.baseUrl}/adventures/${adventureId}/stages/${stageId}/answer`,
      body,
    );
  }
}
