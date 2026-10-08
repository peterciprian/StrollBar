import { RenderMode } from '@angular/ssr';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { ForgotPasswordPageComponent } from './pages/auth/forgot-password-page.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { ResetPasswordPageComponent } from './pages/auth/reset-password-page.component';

// The real package is ESM-only (it cannot be required by Jest); only the RenderMode enum is needed here.
jest.mock('@angular/ssr', () => ({ RenderMode: { Server: 0, Client: 1, Prerender: 2 } }));

describe('app routes', () => {
	const findRoute = (path: string) => routes.find((route) => route.path === path);

	it.each([
		['auth/login', LoginPageComponent],
		['auth/forgot-password', ForgotPasswordPageComponent],
		['auth/reset-password', ResetPasswordPageComponent]
	])('maps %s to its public page', (path, component) => {
		const route = findRoute(path);

		expect(route?.component).toBe(component);
		expect(route?.canActivate).toBeUndefined();
	});

	it('declares the password reset routes before the wildcard fallback', () => {
		const wildcardIndex = routes.findIndex((route) => route.path === '**');

		expect(routes.findIndex((route) => route.path === 'auth/forgot-password')).toBeLessThan(wildcardIndex);
		expect(routes.findIndex((route) => route.path === 'auth/reset-password')).toBeLessThan(wildcardIndex);
	});

	it('keeps the password reset pages client-rendered so reset tokens never reach the SSR server', () => {
		const explicitPaths = serverRoutes.map((route) => route.path);

		expect(explicitPaths).not.toContain('auth/forgot-password');
		expect(explicitPaths).not.toContain('auth/reset-password');
		expect(serverRoutes.find((route) => route.path === '**')?.renderMode).toBe(RenderMode.Client);
	});
});
