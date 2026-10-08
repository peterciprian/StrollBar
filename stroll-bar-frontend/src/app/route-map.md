# StrollBar Angular Route Map

## Public Routes

- /explore (stroll browser)
- /adventure/:adventureId
- /admin/user-list (admin role only)
- /admin/adventures (admin role only)
- /admin/badges (admin role only)
- /user-dashboard
- /users/:userId

## Auth Routes

- /auth/login
- /auth/register
- /auth/forgot-password (request a password reset email)
- /auth/reset-password?token=... (set a new password from the emailed link; the token is removed from the URL after load)

## Authenticated Routes

- /strolls (own strolls; admins see every stroll)
- /creator/strolls/new
- /creator/strolls
- /creator/strolls/:strollId/edit
- /adventures/:adventureId
- /settings (redirects to `/settings/profile`)
- /settings/profile
- /settings/achievements
- /settings/analytics
- /settings/reviews
- /settings/settings

## Notes

- Route guards should be added for authenticated routes.
- The stroll browser is available at `/explore`.
- Adventure sessions use `/adventure/:adventureId`.
- Creator stroll editing is available at `/creator/strolls` and its `new`/`edit` variants.
- The client is served on Vercel and the Angular router uses path URLs. Emailed reset links open `/auth/reset-password?token=...` directly; no GitHub Pages hash-route bridge is needed.
- The reset page captures the token in component-local state, then removes only the `token` query parameter using `replaceUrl: true`, replacing the current browser history entry. The token is not stored in browser storage or the application store; refreshing the cleaned URL shows the missing-link state.
