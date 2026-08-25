# StrollBar Angular Route Map

## Public Routes

- /explore (tour browser)
- /adventure/:adventureId
- /admin-tour-list
- /user-dashboard
- /users/:userId

## Auth Routes

- /auth/login
- /auth/register

## Authenticated Routes

- /creator/strolls/new
- /creator/strolls
- /creator/strolls/:strollId/edit
- /adventures/:adventureId
- /settings (redirects to `/settings/profile`)
- /settings/profile
- /settings/achievements
- /settings/analytics
- /settings/settings

## Notes

- Route guards should be added for authenticated routes.
- The tour browser is available at `/explore`.
- Adventure sessions use `/adventure/:adventureId`.
- Creator stroll editing is available at `/creator/strolls` and its `new`/`edit` variants.
