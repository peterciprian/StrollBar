import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer } from '@angular/core';
import { HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { userReducer, fetchMe } from './features/auth/auth.state';
import { AuthEffects } from './features/auth/auth.effects';
import { authInterceptor } from './core/services/auth.interceptor';
import { errorNotificationInterceptor } from './core/services/error-notification.interceptor';
import { map } from 'rxjs/operators';
import { AppErrorHandler } from './core/services/app-error-handler';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';

const versionedResponseInterceptor = (request: any, next: any) =>
	next(request.clone({ setHeaders: { Accept: 'application/vnd.strollbar.v2+json' } })).pipe(
		map((event: unknown) => (event instanceof HttpResponse && event.body?.status === 'success' ? event.clone({ body: event.body.data }) : event))
	);

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(routes, withHashLocation()),
		provideHttpClient(withInterceptors([versionedResponseInterceptor, errorNotificationInterceptor, authInterceptor])),
		provideTranslateService({ lang: 'hu', fallbackLang: 'hu' }),
		// Relative (no leading slash) so it resolves against <base href>, not the site origin root.
		...provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
		provideStore({ user: userReducer }),
		provideEffects(AuthEffects),
		provideServiceWorker('ngsw-worker.js', {
			enabled: environment.production,
			registrationStrategy: 'registerWhenStable:30000'
		}),
		{ provide: ErrorHandler, useClass: AppErrorHandler },
		provideAppInitializer(() => {
			inject(Store).dispatch(fetchMe());
		})
	]
};
