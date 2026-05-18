# Job Assist Ghana - Next Steps Roadmap

This roadmap reflects the current state of the frontend and sets the next phase of work as **backend integration and production hardening**.

The repository is still primarily a static frontend prototype using browser storage as a placeholder. The next milestone is to replace that simulated state with secure backend APIs, database-backed persistence, verified payments, and enforceable business rules.

---

## 1) Immediate Direction

The next phase is not a major visual redesign.  
The next phase is to make the existing product flows real, enforceable, and secure.

Primary objective:
- connect the frontend to a real backend that becomes the source of truth for:
  - auth
  - roles
  - profiles
  - jobs
  - applications
  - per-application documents
  - applicant unlocks
  - payments
  - notifications
  - audit/admin actions

---

## 2) Recommended Priority Order

### A. Database schema and migrations
Design the schema first around the current product model:
- users
- candidate profiles
- employer profiles
- jobs
- applications
- application documents
- payments
- boosts
- applicant unlocks
- notifications
- reports
- audit logs

Critical schema decisions to include:
- application documents belong to a specific application
- candidate profile image is optional
- candidate image fields must support null/empty cleanly
- job records must support package type, payment state, expiry, and active visibility
- applications must support free vs premium
- notifications must support privacy-safe preview text

### B. Authentication and roles
Implement:
- candidate auth
- employer auth
- admin-capable role model
- protected profile endpoints
- ownership and role checks on all sensitive endpoints

Priority rules:
- candidate sees only own profile/applications
- employer sees only own jobs/applicants
- admin actions are logged

### C. Employer job posting flow
Replace localStorage job posting with real backend flow:
- create job draft
- choose package
- initiate payment
- verify payment server-side
- activate job only after verification
- set expiry server-side

Current pricing to support:
- Standard Job Posting: **GHS 300 for 30 days**
- Premium Job Posting: **GHS 500 for 3 months**

### D. Candidate browse and apply flow
Connect Browse Jobs and View Details to backend data:
- candidate-visible jobs must be active, paid, and non-expired
- closed/expired/unpaid/pending-payment/deleted jobs must not be candidate-applicable
- duplicate application prevention must move server-side
- application status must persist server-side

Frontend behavior to preserve:
- mobile browse-jobs pagination: **6 per page**
- larger-screen browse-jobs pagination: responsive larger page sizes
- pagination/search/filter based on filtered results

### E. Per-application document uploads
Implement real storage and validation for application-specific documents:
- maximum 3 documents per application
- allowed types:
  - PDF
  - DOC
  - DOCX
  - JPG
  - PNG
- max size: **5MB per file**

Important:
- do not reintroduce signup-level supporting documents
- documents are not profile-wide
- employer applicant review must use only documents attached to that application

### F. Applicant unlock flow
Implement paid unlock of applicant contact details:
- employer sees basic applicant information first
- contact details and full access are gated by unlock payment
- backend verifies unlock payment before granting access

Current price to support:
- **GHS 100 per applicant unlock**

### G. Payment verification
This is security-critical and must not be deferred too long.

Backend must verify all paid flows server-side:
- employer job posting
- candidate premium application
- candidate boosts
- employer applicant unlock

Current paid candidate services to support:
- Premium application: **GHS 50**
- Professional Boost: **GHS 120 / 30 days**
- Enterprise Boost: **GHS 200 / 90 days**

Important rule:
- backend must never trust frontend amount, duration, package, expiry, or success status

### H. Notifications
Move notification creation and read state server-side.

Must support:
- candidate application submitted
- premium application completed
- applicant accepted/rejected
- employer new applicant notification
- applicant unlock completed
- payment-related events

Privacy requirement:
- employer notifications must not expose candidate names in preview text
- use wording such as:
  - `You have a new applicant.`
  - `{Job Title} has a new applicant.`

### I. Admin, moderation, and audit
Implement at least a basic internal control layer:
- audit logs
- report review
- payment trail
- user suspension
- job moderation

Also support safety rules such as:
- false or malicious reports may lead to restrictions
- rejected candidates should not be able to abuse reporting against the same job

---

## 3) Recommended First Integration Test

The first full backend integration test should be:

1. Employer creates a paid job draft.
2. Backend initiates payment for the selected package.
3. Backend verifies payment with the payment provider.
4. Verified job appears to candidates in Browse Jobs.
5. Candidate opens the job and applies with documents.
6. Employer sees the applicant in locked/basic form.
7. Employer pays to unlock the applicant.
8. Backend verifies unlock payment.
9. Employer accepts or rejects the applicant.
10. Candidate sees the updated application status in My Applications.

If this flow works end-to-end, the platform's core marketplace loop is functioning.

---

## 4) Detailed Work Plan

### Phase 1 - Schema + auth foundation
- finalize database entities
- add migrations
- build auth/session flow
- implement roles and ownership checks
- build current-user endpoints

### Phase 2 - Employer posting and candidate job visibility
- create job draft endpoints
- create payment-initiation for job posting
- add server-side payment verification
- add active/expired/pending-payment visibility logic
- expose candidate-safe job list endpoint with search/filter/pagination

### Phase 3 - Candidate applications and documents
- create applications endpoint
- prevent duplicates server-side
- support `free` and `premium`
- support application-specific file upload
- persist candidate application history
- expose employer applicant list

### Phase 4 - Applicant unlock and status updates
- create applicant unlock payment flow
- enforce locked/unlocked access rules
- implement accept/reject/in-review status transitions
- expose candidate-facing status changes

### Phase 5 - Notifications and audit
- build event-driven notification creation
- add read/unread state
- add privacy-safe employer notification preview text
- add audit logs for jobs, applications, payments, unlocks, and reports

### Phase 6 - Admin and safety controls
- report review tools
- moderation actions
- suspended user handling
- refund/dispute support workflow

---

## 5) Rules the Backend Must Own

These rules may appear in the frontend, but must be enforced server-side:

- candidate basic application is free
- premium application costs **GHS 50**
- job posting package prices and durations
- boost pricing and durations
- applicant unlock pricing
- job expiry and visibility
- duplicate application prevention
- max 3 documents per application
- allowed file types and size limits
- candidate can only apply to active, paid, non-expired jobs
- expired/closed jobs cannot be boosted
- employer notification previews must not reveal applicant names
- rejected candidate report restrictions / abuse controls

---

## 6) Frontend Integration Notes

While connecting the existing pages:
- do not assume the current browser storage format is final
- treat localStorage/sessionStorage as temporary UI scaffolding
- keep the frontend UX behavior where possible, especially:
  - optional candidate profile picture
  - avatar initials fallback when no profile image exists
  - browse-jobs pagination behavior
  - per-application document upload flow
  - compact applicant document labels like `pdf1`, `doc1`, `jpg1`
  - candidate application status tracking

---

## 7) Suggested Near-Term Deliverables

The next developer handoff should ideally produce:
- schema design / ERD
- migration set
- auth endpoints
- job posting + payment verification endpoints
- candidate browse/apply endpoints
- document upload handling
- applicant unlock endpoints
- notification endpoints
- seed data / test data plan
- API documentation

---

## 8) Nice-to-Haves After Core Integration

After the core backend works:
- analytics and reporting
- richer admin dashboard
- improved moderation tooling
- email/SMS notifications
- more advanced candidate/employer verification workflows
- better search relevance / recommendation logic

---

## 9) Practical Next Action

If one developer is starting today, the best first task is:

1. read [docs/BACKEND_REQUIREMENTS.md](C:/Users/localhost/Downloads/jobassistghana_clean_v1/docs/BACKEND_REQUIREMENTS.md)
2. finalize the database entity map
3. implement auth + roles
4. implement the employer paid job-posting flow
5. wire the candidate browse/apply flow to those verified jobs

That path unlocks the rest of the platform cleanly.
