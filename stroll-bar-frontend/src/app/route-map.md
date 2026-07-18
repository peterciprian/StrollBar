# StrollBar Angular Route Map

## Public Routes
- /explore
- /strolls/:strollId
- /users/:userId

## Auth Routes
- /auth/login
- /auth/register

## Authenticated Routes
- /creator/strolls/new
- /creator/strolls/:strollId/edit
- /adventures/:adventureId

## Notes
- Route guards should be added for authenticated routes.
- Explore and stroll detail are browse/read MVP routes.
- Adventure route powers stage-by-stage progression.
