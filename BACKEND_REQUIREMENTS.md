# Job Assist Ghana — Backend Requirements (Stack-Agnostic)

This document defines the **minimum backend requirements** to turn the current frontend UI into a working platform.  
It is intentionally **stack-agnostic**: the backend developer may use any tools/frameworks/language they are most productive with.

---

## 1) Goals

### Primary Goal (MVP)
Provide a secure backend API that supports:
- Authentication (candidate/employer)
- Job posting and job browsing
- Job applications and application status updates
- Basic profiles for candidates and employers

### Secondary Goal (Phase 2)
Add monetization and growth features:
- Paystack payments with server-side verification
- Job/profile boosting
- Admin moderation tools
- Notifications and analytics

---

## 2) User Roles and Permissions

### Roles
- **candidate**: job seeker
- **employer**: job poster
- **admin** (optional for MVP): moderation/management

### Permissions (MVP)

#### Candidate
- Register/Login
- View jobs
- View job details
- Apply for jobs
- View own applications
- Update own profile

#### Employer
- Register/Login
- Create job posts
- Edit own job posts
- Close own job posts
- View applicants for own job posts
- Update application status for applicants to own jobs
- Update company profile

#### Admin (Phase 2)
- Approve/Remove job posts
- Suspend users
- Moderate spam content

---

## 3) Core Data Entities (Minimum)

Backend dev may choose relational or document DB, but must support these entities:

### User
- id
- email (unique) OR phone (unique) (prefer email + optional phone)
- password hash
- role (candidate/employer/admin)
- created_at, updated_at

### CandidateProfile
- user_id (FK)
- full_name
- location
- skills (string or list)
- bio (optional)
- created_at, updated_at

### EmployerProfile
- user_id (FK)
- company_name
- location
- contact_email (optional)
- contact_phone (optional)
- website (optional)
- created_at, updated_at

### Job
- id
- employer_user_id (FK)
- title
- location
- job_type (optional)
- salary_range (optional)
- description
- status: open/closed
- created_at, updated_at

### Application
- id
- job_id (FK)
- candidate_user_id (FK)
- cover_letter (optional)
- cv_url (optional)
- status: submitted/reviewing/shortlisted/rejected/interview/hired
- created_at, updated_at

---

## 4) Authentication Requirements (MVP)

Backend must provide secure authentication using **any proven method**, for example:
- JWT (access + refresh) OR server sessions
- Passwords must be hashed (bcrypt/argon2 recommended)
- Role-based access control enforced on API routes

### Minimum auth endpoints
- Register
- Login
- Logout (optional if JWT)
- Refresh token (recommended if JWT)

---

## 5) API Endpoints (Suggested Contract)

The backend dev can adjust naming, but should keep the spirit of these endpoints so the frontend can integrate easily.

### 5.1 Auth
#### POST `/auth/register`
Creates a new user and role profile.
**Body:**
- email
- password
- role (candidate/employer)
- optional profile fields

#### POST `/auth/login`
Authenticates a user.
**Body:**
- email (or phone)
- password

#### POST `/auth/logout` (optional)
Invalidates refresh token/session.

#### POST `/auth/refresh` (recommended)
Issues new access token.

---

### 5.2 Profile
#### GET `/me`
Returns current authenticated user + role profile.

#### PATCH `/me`
Updates candidate/employer profile fields.

---

### 5.3 Jobs
#### GET `/jobs`
Returns job list with optional query params:
- `q` (search text)
- `location`
- `job_type`
- `status=open` (default)
- `page`, `limit`

#### GET `/jobs/:id`
Returns single job details.

#### POST `/jobs` (employer only)
Creates a new job post.

#### PUT `/jobs/:id` (employer owner only)
Edits an existing job post.

#### PATCH `/jobs/:id/close` (employer owner only)
Closes a job (status → closed).

---

### 5.4 Applications
#### POST `/applications` (candidate only)
Apply to a job.
**Body:**
- job_id
- cover_letter (optional)
- cv_url (optional)

Rules:
- prevent duplicate applications by same user for same job

#### GET `/applications/me` (candidate only)
Returns the candidate’s applications.

#### GET `/jobs/:id/applications` (employer owner only)
Returns applicants for a specific job.

#### PATCH `/applications/:id/status` (employer owner only)
Updates application status.
**Body:**
- status (reviewing/shortlisted/rejected/interview/hired)

---

## 6) Payment Rules (Phase 2: Paystack)

The frontend contains UI pages for payments/boosting. Backend must enforce security.

### Critical rule
✅ **Never trust the client for amount, plan type, or what is being boosted.**

### Required payment flow
1. Frontend calls `POST /payments/initiate`
2. Backend determines:
   - amount
   - purpose (job_boost / profile_boost)
   - resource target (job_id, employer_id, etc.)
3. Backend returns Paystack transaction reference/authorization data
4. Frontend completes Paystack checkout
5. Frontend calls `POST /payments/verify` with reference
6. Backend verifies with Paystack and only then:
   - marks payment as success
   - activates boost

### Suggested endpoints
- `POST /payments/initiate`
- `POST /payments/verify`
- Webhook endpoint (recommended): `POST /payments/webhook`

### Payment entity (Phase 2)
- id
- user_id
- reference
- amount
- currency
- purpose
- status (initiated/success/failed)
- metadata (JSON)
- created_at

### Boost entity (Phase 2)
- id
- type (job/profile)
- job_id (nullable)
- employer_user_id
- start_at
- end_at
- active
- payment_id

---

## 7) MVP Milestones (Recommended Order)

### Milestone 1 — Auth + Roles (MVP)
- Register/Login
- Role profiles created
- Protected routes working

### Milestone 2 — Employer Jobs (MVP)
- Employer can create jobs
- Employer can edit/close jobs
- Public can list/view jobs

### Milestone 3 — Applications (MVP)
- Candidate can apply to jobs
- Candidate can view own applications
- Employer can view applicants per job

### Milestone 4 — Status Updates (MVP)
- Employer can update application status
- Candidate sees updated status

### Milestone 5 — Payments & Boosting (Phase 2)
- Paystack initiate + verify
- Boost activation rules enforced server-side

---

## 8) Non-Functional Requirements (Minimum)

- Input validation on all endpoints
- Proper error responses (clear messages and status codes)
- CORS configured to allow frontend domain
- Basic logging for errors and payment verification
- Environment variables for secrets (Paystack keys, DB connection, JWT secret)

---

## 9) Deliverables from Backend Developer

Minimum deliverables expected:
- API deployed to a stable host
- Database provisioned
- Postman/Insomnia collection or API docs (Swagger/OpenAPI preferred)
- `.env.example` file showing required env vars
- Short setup instructions in backend README

---

## 10) Notes About Current Frontend

Current UI is implemented as static pages and may use localStorage placeholders.  
Backend dev may choose the integration approach:
- retrofit API calls into existing JS
- add a small client-side API wrapper
- or migrate to a framework later (optional)

The priority is making the platform functional end-to-end.
