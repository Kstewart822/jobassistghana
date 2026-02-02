# Job Assist Ghana — Next Steps Roadmap

This roadmap outlines the next development phase for Job Assist Ghana.  
The current repository is mainly **frontend UI (HTML/CSS/JS)** and is already deployed on GitHub Pages.

Goal: move from a static frontend to a fully functional platform with authentication, database, APIs, and secure payments.

---

## 1) Define the “MVP” Scope (First Release)
### Candidate (Job Seeker)
- Sign up / login
- Browse jobs
- View job details
- Apply for a job
- Track applications (status updates)
- Profile editing (basic)
- CV builder (export to PDF)

### Employer
- Sign up / login
- Post a job
- Edit/close a job
- View applicants
- Mark applicant status (shortlisted/rejected/interview)

### Admin (Optional for MVP)
- Basic moderation: approve job posts, remove spam

---

## 2) Backend Foundation (Priority)
### Recommended stack (choose one)
- **Node.js + Express + PostgreSQL**
- **Django + PostgreSQL**
- **Laravel + MySQL**
- (Any stack is fine — keep the API RESTful or use GraphQL)

### Database tables (starter)
- users (role: candidate/employer/admin)
- candidates (profile info)
- employers (company info)
- jobs
- applications
- payments
- boosts (job boosts / profile boosts)
- cv_profiles (optional, for saving CV drafts)

---

## 3) Authentication & Authorization (Priority)
- Implement secure login/signup
- Role-based access control:
  - candidate routes
  - employer routes
  - admin routes
- Use:
  - JWT (access + refresh tokens) OR server sessions
- Add password reset flow (email/SMS later)

---

## 4) API Endpoints (Priority)
### Auth
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh
- POST /auth/forgot-password
- POST /auth/reset-password

### Jobs
- GET /jobs (filter, search)
- GET /jobs/:id
- POST /jobs (employer only)
- PUT /jobs/:id (owner only)
- DELETE /jobs/:id (owner/admin)

### Applications
- POST /applications (candidate only)
- GET /applications/me (candidate)
- GET /jobs/:id/applications (employer)
- PATCH /applications/:id/status (employer)

### Profile
- GET /me
- PATCH /me

---

## 5) Connect Frontend to Backend (Priority)
Replace the current placeholder/localStorage logic with real API calls:
- login/signup forms submit to API
- job posting saves to DB
- job browsing loads from API
- applications are stored and tracked server-side

Suggested approach:
- Start with 1 flow end-to-end:
  1) Employer posts job
  2) Candidate sees job
  3) Candidate applies
  4) Employer sees applicant

---

## 6) Payments & Boosting (Security Critical)
The UI already includes Paystack flow pages. Next steps:
- Do NOT trust amount/job IDs on the client
- Create backend endpoints for:
  - creating a Paystack transaction (server generates amount + reference)
  - verifying the transaction after payment
  - applying boost only after verified success

### Suggested flow
1. Frontend requests payment intent: POST /payments/initiate
2. Backend returns reference + amount
3. Frontend completes Paystack checkout
4. Frontend calls POST /payments/verify
5. Backend verifies with Paystack and activates boost

Also add:
- webhooks (recommended)
- receipts/logging

---

## 7) Improve Project Maintainability (After Backend Works)
Frontend improvements:
- Extract repeated navbar/footer into reusable components
  - server templates, partials, or a frontend framework
- Move inline scripts and CSS into:
  - /assets/js
  - /assets/css
- Standardize page naming and folder organization:
  - /candidate
  - /employer
  - /admin

---

## 8) Quality, Security, and UX (Ongoing)
- Form validation everywhere
- Consistent error messages + loading states
- Mobile responsiveness checks
- Input sanitization and server validation
- Rate limiting on auth endpoints
- Logging and monitoring

---

## 9) Nice-to-Haves (Later)
- CV templates (multiple styles)
- Email/SMS notifications (application updates)
- Employer verification badge
- Admin dashboard
- Analytics: views, clicks, applicants
- Job recommendations

---

## Suggested Milestones
### Milestone 1 — Backend MVP
- Auth + Jobs + Applications working end-to-end

### Milestone 2 — Payments
- Paystack verification + boosting activated securely

### Milestone 3 — Cleanup
- Refactor repeated UI components + organize assets

### Milestone 4 — Growth
- Notifications + analytics + admin tools
