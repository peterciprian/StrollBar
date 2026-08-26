import { createAction, props, createReducer, on, createFeatureSelector, createSelector } from '@ngrx/store';
import { LoginRequest, RegisterRequest, User } from '../../core/api/models';

export type UserState = User & {
	loading: boolean;
	error: any;
};

const initialState: UserState = {
	id: '',
	username: '',
	email: '',
	profileImageUrl: null,
	isActive: false,
	createdAt: '',
	updatedAt: '',
	loading: false,
	error: null
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
	})
);

export const selectUser = createFeatureSelector<UserState>('user');

export const selectIsLoggedIn = createSelector(selectUser, (user) => !!user.id);

export const selectUsername = createSelector(selectUser, (user) => user.username);

export const selectAuthLoading = createSelector(selectUser, (user) => user.loading);

export const selectAuthError = createSelector(selectUser, (user) => user.error);
