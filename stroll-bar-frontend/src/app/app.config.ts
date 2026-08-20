import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(routes, withHashLocation()),
		provideHttpClient(withInterceptors([errorNotificationInterceptor, authInterceptor])),
		provideTranslateService({ lang: 'hu', fallbackLang: 'hu' }),
		// Relative (no leading slash) so it resolves against <base href>, not the site origin root.
		...provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
		provideStore({ user: userReducer }),
		provideEffects(AuthEffects),
		provideAppInitializer(() => {
			inject(Store).dispatch(fetchMe());
		})
	]
};
