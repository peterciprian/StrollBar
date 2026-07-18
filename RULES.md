## StrollBar Product Rules

### 1. Vision
StrollBar is a social sightseeing platform where users can discover and publish ordered walking tours ("strolls") around cities, landmarks, districts, and famous buildings.

The core experience combines:
- Social content (user-generated strolls)
- Structured exploration (stages in strict order)
- Optional puzzle/riddle interaction at stage level

### 2. Technology Constraints
- Backend: Nest.js + TypeScript
- Frontend: Angular
- Primary API style: REST
- Primary relational database: PostgreSQL
- Media storage: S3-compatible object storage

### 3. Roles
- Guest: browse public strolls and view limited details
- Registered User: full browse, unlock, progress, and create capabilities
- Creator: any registered user who publishes strolls
- Admin (future): moderation and policy enforcement

### 4. Core Domain Model

#### 4.1 User
- id
- username
- email
- passwordHash
- profileImageUrl (optional)
- createdAt
- updatedAt
- isActive

#### 4.2 Stroll
- id
- name
- authorId (creator user id)
- activeStatus (draft, published, archived)
- labels (string[])
- description
- proposerText
- mediaUrls
    - imageUrls (string[])
    - videoUrls (string[])
- publicityFlag (public, unlisted, private)
- stageCount
- createdAt
- updatedAt

Rules:
- A stroll is composed of stages in a strict sequence.
- Public strolls are visible in browse/search.
- Draft/private strolls are only visible to owner (and admin in future).

#### 4.3 Stage
- id
- strollId
- orderIndex (1..n)
- name
- description
- notes
- imageUrls (string[])
- videoUrls (string[])
- address
- latitude
- longitude
- riddleAnswer (optional, hashed or normalized server-side)
- createdAt
- updatedAt

Rules:
- orderIndex must be unique per stroll.
- A stage may include an optional riddle in description and expected answer in riddleAnswer.

#### 4.4 Adventure (User Journey of a Stroll)
- id
- ownerUserId
- strollId
- purchaseTime
- startDateTime (optional)
- completionDateTime (optional)
- progressStatus (purchased, in_progress, completed, abandoned)
- currentStageIndex
- createdAt
- updatedAt

Purpose:
- Represents a single user's journey for a specific stroll.
- "Unlock stroll" creates an Adventure so each user tracks independent progress.

#### 4.5 Stage Attempt (Optional but Recommended)
- id
- adventureId
- stageId
- providedAnswer
- isCorrect
- attemptedAt

#### 4.6 Media Asset (Storage-backed Reference)
- id
- storageKey
- publicUrl
- contentType
- sizeBytes
- uploadedByUserId
- purpose (stroll, stage, profile)
- strollId (optional)
- stageId (optional)
- profileUserId (optional)
- uploadStatus (pending, uploaded, aborted, failed)
- uploadMode (single_part, multipart)
- multipartUploadId (optional while multipart is active)
- createdAt

Rules:
- Each upload request must create a persisted media metadata record in PostgreSQL.
- Each media asset must belong to exactly one uploader user.
- A media asset may optionally be linked to a stroll, stage, or profile user depending on purpose.

- Binary files are stored in S3-compatible object storage, not in PostgreSQL.
- PostgreSQL stores only media references/URLs and related metadata.
- Uploads must satisfy MIME-type and size policies configured by environment.
- Large video uploads should use multipart upload flow.

### 5. Functional Requirements

#### 5.1 Authentication
- User registration
- User login
- Secure JWT-based session handling
- Password hashing with a modern algorithm (Argon2 or bcrypt)

#### 5.2 Browse and Discovery
- List public strolls with pagination
- Search by name/description
- Filter by labels, city/address text, and author
- Sort by newest, most used, and best rated (rating can be future)

#### 5.3 Create and Manage Strolls
- Authenticated users can create strolls
- Creator can add/edit/remove/reorder stages
- Creator can set publicityFlag and activeStatus
- Validation on required fields before publish

Publish validation minimum:
- Stroll has name + description
- At least 1 stage exists
- Every stage has name, description + either address or coordinates

#### 5.4 Read/View Stroll
- Users can view stroll overview and ordered stage list
- Public media should render in a responsive gallery player
- Stage details include map coordinates and notes

#### 5.5 Unlock and Progress Through Stroll
- Authenticated user can unlock a stroll
- Unlock creates a personal Adventure
- User starts at stage 1 and advances in order
- If stage has riddle, user submits answer to proceed
- Backend validates answer and updates progress atomically

#### 5.6 Social Foundation (MVP-light)
- Creator profile with published strolls
- Basic counters: unlockCount, completionCount
- Reporting inappropriate content (simple flag endpoint)

#### 5.7 Health and Storage
- Health endpoint must verify PostgreSQL connectivity.
- Health endpoint must verify S3-compatible storage bucket reachability.
- Media upload flow must support single-part and multipart upload issuance.

### 6. API and Module Boundaries (Nest.js)
- AuthModule: register/login/me
- UsersModule: public profile and own profile management
- StrollsModule: CRUD, list/search/filter
- StagesModule: nested under strolls, reorder endpoint
- AdventuresModule: purchase/unlock/start/progress/complete
- MediaModule: presigned upload URL generation and storage integration
- App/Health surface: dependency health checks for database and storage

### 7. Frontend Boundaries (Angular)
- Auth pages: register/login
- Explore pages: stroll feed, filters, detail view
- Creator studio: create/edit stroll + stage manager
- Progress pages: unlocked stroll session + stage progression
- Shared components: media gallery, stage card, map preview, label chips

### 8. Validation Rules
- String fields must be trimmed
- Labels normalized to lowercase for filtering
- URL arrays must contain valid URL format only
- Media upload requests must satisfy allowed MIME-type and file-size policies
- Coordinates must satisfy:
    - latitude in [-90, 90]
    - longitude in [-180, 180]
- Reorder operation must keep contiguous orderIndex values

### 9. Security and Privacy
- Enforce authorization checks on all mutation endpoints
- Private strolls cannot leak through search or direct lookup
- Rate-limit auth and answer submission endpoints
- Audit trail for critical actions (publish/unpublish/delete)
- Use presigned upload URLs so clients upload media directly to object storage

### 10. Non-Functional Requirements
- Mobile-first responsive UX
- API response time target: p95 under 400ms for browse/read endpoints
- Basic observability: structured logs, request IDs, error tracking
- Database migrations required for schema changes; no schema sync in production
- Test coverage goals:
    - Unit tests for domain services
    - Integration tests for auth, stroll publish, unlock flow

### 11. MVP Scope (Must Have)
- Register/login
- Browse public strolls
- Create/edit/publish stroll with ordered stages
- View stroll details
- Unlock stroll
- Progress stage-by-stage with optional riddle answer validation

### 12. Post-MVP Scope (Should Have)
- Moderation dashboard for admins
- Browse user profiles
- Geofence arrival checks per stage
- Badges/gamification
- Ratings and reviews
- Hints for completing stages that decrease earned score
- Score for completing stages below a specified time limit
- Scoreboard for strolls
- Recommend strolls to other users

### 13. Open Clarification
The requested flow "unlock stroll (unlocking an own instance and ...)" appears truncated. Current rule assumes this means each user gets an independent progress instance that can be resumed later.