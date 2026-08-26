import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthFeatureService } from './auth-feature.service';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import {
	fetchMe,
	fetchMeFailure,
	fetchMeSuccess,
	logIn,
	loginFailure,
	loginSuccess,
	logout,
	register,
	registerFailure,
	registerSuccess
} from './auth.state';

@Injectable()
export class AuthEffects {
	private readonly actions$ = inject(Actions);
	private readonly authFeatureService = inject(AuthFeatureService);
	private readonly router = inject(Router);

	loadMe$ = createEffect(() =>
		this.actions$.pipe(
			ofType(fetchMe),
			switchMap(() =>
				this.authFeatureService.loadMe().pipe(
					map((user) => fetchMeSuccess({ user })),
					catchError((error) => of(fetchMeFailure({ error })))
				)
			)
		)
	);

	register$ = createEffect(() =>
		this.actions$.pipe(
			ofType(register),
			switchMap(({ user }) =>
				this.authFeatureService.register(user).pipe(
					map((registeredUser) => registerSuccess({ user: registeredUser })),
					catchError((error) => of(registerFailure({ error: extractErrorMessage(error) })))
				)
			)
		)
	);

	login$ = createEffect(() =>
		this.actions$.pipe(
			ofType(logIn),
			switchMap(({ user }) =>
				this.authFeatureService.login(user).pipe(
					map((loggedInUser) => loginSuccess({ user: loggedInUser })),
					catchError((error) => of(loginFailure({ error: extractErrorMessage(error) })))
				)
			)
		)
	);

	redirectAfterAuth$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(loginSuccess),
				tap(() => this.router.navigateByUrl(this.getReturnUrl() ?? '/explore'))
			),
		{ dispatch: false }
	);

	redirectAfterRegister$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(registerSuccess),
				tap(() => this.router.navigateByUrl('/explore'))
			),
		{ dispatch: false }
	);

	logout$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(logout),
				switchMap(() =>
					this.authFeatureService.logout().pipe(
						tap(() => this.router.navigateByUrl('/auth/login')),
						catchError(() => of(null))
					)
				)
			),
		{ dispatch: false }
	);

	private getReturnUrl(): string | null {
		const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];

		if (typeof returnUrl !== 'string' || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
			return null;
		}

		return returnUrl;
	}
}
