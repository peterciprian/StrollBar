# StrollBar Angular Route Map

## Public Routes

- /explore (tour browser)
- /adventure/:adventureId
- /admin-tour-list
- /user-dashboard
- /strolls/:strollId
- /users/:userId

## Auth Routes

- /auth/login
- /auth/register

## Authenticated Routes

- /creator/strolls/new
- /creator/strolls
- /creator/strolls/:strollId/edit
- /adventures/:adventureId

## Notes

- Route guards should be added for authenticated routes.
- The screen views are top-level sibling routes.
- Adventure route powers stage-by-stage progression.
