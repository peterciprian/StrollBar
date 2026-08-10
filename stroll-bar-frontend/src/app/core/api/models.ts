export type StrollActiveStatus = 'draft' | 'published' | 'archived';
export type StrollPublicityFlag = 'public' | 'unlisted' | 'private';
export type AdventureProgressStatus = 'purchased' | 'in_progress' | 'completed' | 'abandoned';

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  profileImageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
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
