import { createAction, props, createReducer, on, createFeatureSelector, createSelector } from '@ngrx/store';
import { ChangePasswordRequest, LoginRequest, RegisterRequest, UpdateUserRequest, User } from '../../core/api/models';

export type UserState = User & {
	loading: boolean;
	error: any;
	profileSaving: boolean;
	profileSaveError: any;
	passwordSaving: boolean;
	passwordSaveError: any;
};

const initialState: UserState = {
	id: '',
	username: '',
	email: '',
	profileImageUrl: null,
	isActive: false,
	role: 'simple',
	emailVerified: false,
	createdAt: '',
	updatedAt: '',
	loading: false,
	error: null,
	profileSaving: false,
	profileSaveError: null,
	passwordSaving: false,
	passwordSaveError: null
};

export const register = createAction('[Auth] Register', props<{ user: RegisterRequest }>());
export const registerSuccess = createAction('[Auth] Register Success', props<{ user: User }>());
export const registerFailure = createAction('[Auth] Register Failure', props<{ error: any }>());

export const logIn = createAction('[Auth] Login', props<{ user: LoginRequest }>());
export const loginSuccess = createAction('[Auth] Login Success', props<{ user: User }>());
export const loginFailure = createAction('[Auth] Login Failure', props<{ error: any }>());

export const socialLoginFailure = createAction('[Auth] Social Login Failure', props<{ error: any }>());

export const fetchMe = createAction('[Auth] Fetch Me');
export const fetchMeSuccess = createAction('[Auth] Fetch Me Success', props<{ user: User }>());
export const fetchMeFailure = createAction('[Auth] Fetch Me Failure', props<{ error: any }>());

export const logout = createAction('[Auth] Logout');

export const updateProfile = createAction('[Auth] Update Profile', props<{ user: UpdateUserRequest }>());
export const updateProfileSuccess = createAction('[Auth] Update Profile Success', props<{ user: User }>());
export const updateProfileFailure = createAction('[Auth] Update Profile Failure', props<{ error: any }>());

export const changePassword = createAction('[Auth] Change Password', props<{ payload: ChangePasswordRequest }>());
export const changePasswordSuccess = createAction('[Auth] Change Password Success');
export const changePasswordFailure = createAction('[Auth] Change Password Failure', props<{ error: any }>());

export const userReducer = createReducer(
	initialState,
	on(register, (state) => {
		return {
			...state,
			loading: true,
			error: null
		};
	}),
	on(registerSuccess, (state, { user }) => {
		return {
			...state,
			...user,
			loading: false,
			error: null
		};
	}),
	on(registerFailure, (state, { error }) => {
		return {
			...state,
			loading: false,
			error
		};
	}),
	on(logIn, (state) => {
		return {
			...state,
			loading: true,
			error: null
		};
	}),
	on(loginSuccess, (state, { user }) => {
		return {
			...state,
			...user,
			loading: false,
			error: null
		};
	}),
	on(loginFailure, (state, { error }) => {
		return {
			...state,
			loading: false,
			error
		};
	}),
	on(socialLoginFailure, (state, { error }) => {
		return {
			...state,
			loading: false,
			error
		};
	}),
	on(logout, (state) => initialState),
	on(fetchMe, (state) => {
		return {
			...state,
			loading: true,
			error: null
		};
	}),
	on(fetchMeSuccess, (state, { user }) => {
		return {
			...state,
			...user,
			loading: false,
			error: null
		};
	}),
	on(fetchMeFailure, () => {
		// No valid session on load/refresh: reset to a clean logged-out state without surfacing an error.
		return initialState;
	}),
	on(updateProfile, (state) => {
		return {
			...state,
			profileSaving: true,
			profileSaveError: null
		};
	}),
	on(updateProfileSuccess, (state, { user }) => {
		return {
			...state,
			...user,
			profileSaving: false,
			profileSaveError: null
		};
	}),
	on(updateProfileFailure, (state, { error }) => {
		return {
			...state,
			profileSaving: false,
			profileSaveError: error
		};
	}),
	on(changePassword, (state) => {
		return {
			...state,
			passwordSaving: true,
			passwordSaveError: null
		};
	}),
	on(changePasswordSuccess, (state) => {
		return {
			...state,
			passwordSaving: false,
			passwordSaveError: null
		};
	}),
	on(changePasswordFailure, (state, { error }) => {
		return {
			...state,
			passwordSaving: false,
			passwordSaveError: error
		};
	})
);

export const selectUser = createFeatureSelector<UserState>('user');

export const selectIsLoggedIn = createSelector(selectUser, (user) => !!user.id);

export const selectUsername = createSelector(selectUser, (user) => user.username);

export const selectAuthLoading = createSelector(selectUser, (user) => user.loading);

export const selectAuthError = createSelector(selectUser, (user) => user.error);

export const selectEmailVerified = createSelector(selectUser, (user) => user.emailVerified);

export const selectProfileSaving = createSelector(selectUser, (user) => user.profileSaving);

export const selectProfileSaveError = createSelector(selectUser, (user) => user.profileSaveError);

export const selectPasswordSaving = createSelector(selectUser, (user) => user.passwordSaving);

export const selectPasswordSaveError = createSelector(selectUser, (user) => user.passwordSaveError);
