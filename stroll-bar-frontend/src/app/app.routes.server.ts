import { RenderMode, ServerRoute } from '@angular/ssr';

// Only truly public, non-parameterized routes get SSR. Everything behind an auth/admin/email
// guard stays RenderMode.Client so guard/auth logic never runs on the server, and login/register
// (public but interactive: reCAPTCHA, social-login redirects) also stay client-only by design.
export const serverRoutes: ServerRoute[] = [
	{ path: '', renderMode: RenderMode.Server },
	{ path: 'impressum', renderMode: RenderMode.Prerender },
	{ path: 'privacy-policy', renderMode: RenderMode.Prerender },
	{ path: 'terms-of-service', renderMode: RenderMode.Prerender },
	// Stroll listings change often; render fresh on every request instead of prerendering stale data.
	{ path: 'explore', renderMode: RenderMode.Server },
	{ path: '**', renderMode: RenderMode.Client }
];
