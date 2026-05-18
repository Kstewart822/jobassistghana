# Job Assist Ghana - Backend Requirements (Stack-Agnostic)

This document is the primary backend handover reference for **Job Assist Ghana**. It describes the current frontend product behavior and the minimum backend capabilities needed to replace the current browser-only state with secure API and database-backed functionality.

The current repo is still a **static HTML/CSS/JavaScript frontend**. Most user state is simulated in `localStorage` / `sessionStorage`. The backend must become the source of truth for authentication, profiles, jobs, applications, payments, documents, notifications, visibility rules, and audit history.

---

## 1) Backend Goals

### Primary Goal
Provide a secure backend that supports:
- candidate and employer authentication
- candidate and employer profiles
- paid employer job posting
- candidate job browsing and job applications
- application-specific document uploads
- employer applicant review and applicant unlock
- application status updates
- secure server-side payment verification
- notifications and audit logging

### Secondary Goal
Support later platform growth with:
- admin moderation
- analytics and reporting
- deeper fraud/risk controls
- richer notification delivery

---

## 2) Product Rules the Backend Must Enforce

The backend must not assume the frontend is trustworthy. All business rules below must be enforced server-side.

### Candidate-facing rules
- Candidate basic signup/account creation is free.
- Candidate signup no longer uploads general supporting documents.
- Candidate profile/passport image is optional.
- If no profile image exists, frontend may render initials; backend must support missing images cleanly.
- Candidates can apply for free:
  - **Free application = GHS 0**
- Candidates can also choose an optional premium application:
  - **Premium application = GHS 50**
- Application documents are **per application**, not profile-wide.
- Each application can store **up to 3 documents**.
- Allowed application document types:
  - PDF
  - DOC
  - DOCX
  - JPG
  - PNG
- Maximum document size:
  - **5MB per document**
- Duplicate applications must be prevented server-side.
- Candidates must only see jobs that are active, paid, non-expired, and available for application.
- Candidates must not apply to:
  - closed jobs
  - expired jobs
  - unpaid jobs
  - deleted jobs
  - pending-payment jobs
- A candidate rejected from a job must not be able to abuse the report flow for that same job. Reports must be genuine and made in good faith.

### Employer-facing rules
- Employers can only manage jobs they own.
- Employers can only view applicants for jobs they posted.
- Employer job posting packages:
  - **Standard Job Posting = GHS 300 for 30 days**
  - **Premium Job Posting = GHS 500 for 3 months**
- Employer unlock of applicant contact details:
  - **GHS 100 per applicant**
- Unlocking reveals the intended candidate contact details and application-specific documents where available.
- Unlocking does not guarantee candidate response or hiring success.
- Employers may accept or reject applicants.
- Expired or closed jobs must not be boostable.
- Employers may still see their own expired/closed jobs in their dashboard history.

### Notifications and privacy rules
- Employer notification previews must not expose private applicant identity unnecessarily.
- New applicant notifications should use neutral wording such as:
  - `You have a new applicant.`
  - `{Job Title} has a new applicant.`
- Backend notification payloads should support privacy-safe preview text.

### Payments and trust model
- Backend must never trust the frontend for:
  - price
  - package type
  - duration
  - expiry date
  - payment success state
  - unlock entitlement
  - premium application entitlement
  - boost duration or activation state
- All paid actions must be activated only after server-side verification with the payment provider.

---

## 3) Roles and Permissions

### Roles
- `candidate`
- `employer`
- `admin` (recommended, even if released later)

### Candidate permissions
- register / log in
- manage own profile
- browse active jobs
- view job details
- apply to jobs
- upload up to 3 documents per application
- choose free or premium application
- track own applications and statuses
- pay for optional boosts
- report jobs/businesses in good faith where allowed

### Employer permissions
- register / log in
- manage employer/company profile
- create job drafts
- pay for job posting package
- view own jobs, including expired/closed jobs
- close jobs
- view applicants for own jobs
- unlock applicant contact details after payment verification
- review attached application documents
- accept or reject applicants

### Admin permissions
- monitor users, jobs, applications, payments, reports, and notifications
- suspend users or moderate abusive content
- review audit logs
- review payment disputes/refund cases

---

## 4) Required Core Entities / Models

Names can vary by backend stack, but equivalent structures are required.

### 4.1 User
- `id`
- `role` (`candidate`, `employer`, `admin`)
- `phone`
- `email` (nullable where current frontend treats it as optional for some flows)
- `password_hash`
- `status` (`active`, `suspended`, `deleted`)
- `last_login_at`
- `created_at`
- `updated_at`

### 4.2 CandidateProfile
- `user_id`
- `full_name`
- `nss_number` (nullable)
- `is_shs_graduate` (boolean)
- `email`
- `phone`
- `gender`
- `date_of_birth` (nullable)
- `ghana_card_number`
- `digital_address`
- `region`
- `field_of_study`
- `experience_level`
- `highest_education`
- `preferred_industry`
- `skills` (up to 3; array or normalized relation)
- `disability_status`
- `profile_image_url` (nullable)
- `profile_image_storage_key` (nullable)
- `created_at`
- `updated_at`

Notes:
- Candidate profile image is optional.
- If no image exists, frontend may render initials; backend must return null/empty cleanly.

### 4.3 EmployerProfile
- `user_id`
- `company_name`
- `industry_or_field`
- `business_type`
- `company_size`
- `business_registration_number` (nullable)
- `company_description`
- `contact_full_name`
- `contact_position`
- `work_email` (nullable / legacy-safe)
- `company_address`
- `city`
- `region`
- `phone`
- `social_links` (0 to 3 links; optional)
- `created_at`
- `updated_at`

### 4.4 Job
- `id`
- `employer_user_id`
- `title`
- `job_id_public` (optional human-readable code if business wants one)
- `description`
- `requirements` (nullable)
- `location_city` (nullable if current frontend does not separate city consistently)
- `location_region`
- `job_type`
- `salary_range` (nullable)
- `category` / `industry`
- `application_deadline` (if used by business rules)
- `package_type` (`standard`, `premium`)
- `package_amount`
- `listing_duration_days` or `expires_at`
- `status` (`draft`, `pending_payment`, `active`, `closed`, `expired`, `deleted`)
- `posted_at`
- `expires_at`
- `payment_id` (nullable until paid)
- `created_at`
- `updated_at`

### 4.5 Application
- `id`
- `job_id`
- `candidate_user_id`
- `application_type` (`free`, `premium`)
- `application_amount` (`0`, `50`)
- `status` (`submitted`, `in_review`, `accepted`, `rejected`, `withdrawn`, etc.)
- `visibility_rank` / `priority_flag` (optional helper for premium handling)
- `verified_badge` (boolean; if premium/verification logic requires it)
- `premium_payment_id` (nullable)
- `submitted_at`
- `updated_at`

Rules:
- unique constraint or equivalent on `(job_id, candidate_user_id)` for active/non-withdrawn applications, depending on product policy
- server-side duplicate prevention is mandatory

### 4.6 ApplicationDocument
- `id`
- `application_id`
- `original_name`
- `file_type`
- `mime_type`
- `file_size_bytes`
- `storage_key` / `file_url`
- `sort_order`
- `created_at`

Rules:
- maximum 3 documents per application
- allowed types only: PDF, DOC, DOCX, JPG, PNG
- maximum 5MB each
- documents belong to a single application only
- backend should not model them as generic signup/profile attachments

### 4.7 ApplicantUnlock
- `id`
- `job_id`
- `application_id`
- `employer_user_id`
- `candidate_user_id`
- `payment_id`
- `amount`
- `status` (`pending`, `active`, `failed`, `refunded`)
- `unlocked_at`
- `created_at`
- `updated_at`

Purpose:
- tracks payment-backed unlocking of applicant contact details and associated access rights

### 4.8 Payment
- `id`
- `user_id`
- `provider` (e.g. `paystack`)
- `reference`
- `amount`
- `currency`
- `purpose`
- `status` (`initiated`, `success`, `failed`, `abandoned`, `refunded`)
- `resource_type`
- `resource_id`
- `package_type` (nullable where relevant)
- `provider_response` / `metadata` (JSON)
- `verified_at`
- `created_at`
- `updated_at`

Supported payment purposes should include at minimum:
- `job_posting`
- `job_boost`
- `candidate_application_premium`
- `applicant_unlock`

### 4.9 Boost
- `id`
- `user_id`
- `resource_type` (`candidate_application`, `job`)
- `resource_id`
- `boost_plan` (`professional`, `enterprise`, or employer-specific boost type)
- `amount`
- `duration_days`
- `status` (`pending`, `active`, `expired`, `failed`)
- `payment_id`
- `starts_at`
- `ends_at`
- `created_at`
- `updated_at`

Current candidate boost plans to support:
- **Professional Boost = GHS 120 for 30 days**
- **Enterprise Boost = GHS 200 for 90 days**

### 4.10 Notification
- `id`
- `recipient_user_id`
- `recipient_role`
- `type`
- `title` (nullable)
- `message`
- `preview_message` (privacy-safe text)
- `related_entity_type`
- `related_entity_id`
- `is_read`
- `read_at`
- `metadata` (JSON)
- `created_at`

### 4.11 Report
- `id`
- `reporter_user_id`
- `target_type` (`job`, `employer`, etc.)
- `target_id`
- `reason`
- `details` (nullable)
- `status` (`open`, `reviewed`, `dismissed`, `actioned`)
- `is_good_faith` (optional review flag)
- `created_at`
- `updated_at`

Rules:
- reports must be genuine and made in good faith
- rejected candidates should not be able to abuse report tools for the job they were rejected from

### 4.12 AuditLog
- `id`
- `actor_user_id`
- `actor_role`
- `action_type`
- `entity_type`
- `entity_id`
- `description`
- `ip_address` (optional)
- `user_agent` (optional)
- `metadata` (JSON)
- `created_at`

---

## 5) Authentication and Authorization Requirements

Backend may use JWT, secure server sessions, or another proven approach, but must provide:
- password hashing (`bcrypt`, `argon2`, or equivalent)
- role-based access control
- protected routes by ownership and role
- session/token invalidation strategy
- password reset flow
- account suspension handling

Minimum auth capabilities:
- candidate registration
- employer registration
- login
- logout
- password reset
- current user profile retrieval

Important:
- Candidate and employer session payloads must not carry stale avatar/image data forward from previous local placeholder state.

---

## 6) API Capability Requirements

The backend developer may rename endpoints, but the API must support these capabilities.

### Auth
- register candidate
- register employer
- login
- logout
- refresh session/token
- forgot password
- reset password

### Current user / profile
- get current user + role profile
- update candidate profile
- update employer profile
- upload/update/remove optional candidate profile image

### Jobs
- create employer job draft
- initiate payment for job posting package
- verify posting payment
- activate paid job only after server verification
- list candidate-visible jobs
- list employer-owned jobs, including expired/closed/pending-payment
- view job details
- edit own job
- close own job
- prevent boost on expired/closed jobs

### Applications
- create application
- support `free` or `premium`
- attach up to 3 documents to the specific application
- initiate and verify premium application payment
- list candidate applications
- list job applicants for employer owner
- update application status
- prevent duplicate application

### Applicant unlock
- initiate applicant unlock payment
- verify applicant unlock payment
- activate unlock only after server verification
- expose unlocked candidate contact details only to entitled employer

### Payments
- initiate payment
- verify payment
- process webhook/callback
- store transaction history and references

### Notifications
- create event-driven notifications
- list notifications per user
- mark one as read
- mark all as read
- support privacy-safe preview messages

### Reports / safety
- create report
- restrict/deny rejected-candidate report abuse for the same job where required
- admin review of reports

### Admin / audit
- list audit logs
- review payments and unlocks
- review reports
- suspend users / moderate content

---

## 7) Search, Filter, Sort, and Pagination Requirements

### Candidate job browsing
Backend must support:
- text search
- filtering by fields currently exposed in the frontend
- pagination
- only active, paid, non-expired jobs

Current frontend behavior:
- mobile browse-jobs pagination shows **6 jobs per page**
- larger screens show more jobs per page responsively to avoid very long job lists

Backend recommendation:
- support `page` + `limit`
- optionally support `sort`
- return total count for filtered results

### Employer applicant review
Backend must support applicant list:
- search
- filter by profile/application fields
- pagination
- applicant status updates

Important:
- pagination must always be based on the filtered result set, not total unfiltered records

---

## 8) Job Visibility and Expiry Rules

These rules are critical and must be enforced server-side.

### Candidate visibility rules
Candidates should only see jobs that are:
- paid
- active
- not expired
- not deleted

Candidates must not apply to jobs that are:
- closed
- expired
- unpaid
- pending-payment
- deleted

### Employer visibility rules
Employers may still view their own:
- active jobs
- closed jobs
- expired jobs
- pending-payment jobs

### Expiry enforcement
Backend must calculate and enforce expiry using server time.

Required package rules:
- **Standard posting:** GHS 300, active for 30 days
- **Premium posting:** GHS 500, active for 3 months

Recommended:
- compute `expires_at` on activation
- run scheduled expiry enforcement
- also guard dynamically on read/apply/boost endpoints

---

## 9) Payments and Verification Requirements

Current frontend includes payment pages for both candidate and employer flows, but backend must be authoritative.

### Critical rule
**Never trust the frontend for payment success, amount, package, duration, or entitlement.**

### Required secure flow
1. Frontend requests payment initiation for a defined purpose.
2. Backend determines the true amount and target resource.
3. Backend creates a pending payment record and provider reference.
4. User completes checkout with the third-party provider.
5. Backend verifies the transaction directly with the provider.
6. Only after successful verification does backend activate:
   - job posting
   - premium application
   - applicant unlock
   - boost

### Refund guidance
Backend/support workflows should allow refund review for:
- duplicate payments
- failed transactions
- erroneous payments
- technical failure where service was not delivered

Prefer collecting supporting evidence within **14 days**.

---

## 10) Notifications Requirements

The frontend already expects notification-style behavior. Backend should support:
- application submitted
- premium application completed
- applicant unlock completed
- application accepted/rejected
- employer new-applicant notification
- payment success/failure records

Privacy rule:
- notification preview text must not expose sensitive candidate details unnecessarily
- employer new-applicant notifications should use neutral wording

---

## 11) Avatar / Profile Image Rules

Backend must support optional candidate profile images.

Required behavior:
- if a candidate uploads a valid profile image, return it
- if no candidate image exists, return null/empty cleanly
- do not inject placeholder face images at the data layer
- frontend may render a first-letter initial avatar using the candidate's name

Older records with no image must remain valid.

---

## 12) Data Protection, Audit, and Compliance Notes

The platform content now references Ghanaian legal context, including:
- Labour Act, 2003 (Act 651)
- Data Protection Act, 2012 (Act 843)
- Electronic Transactions Act, 2008 (Act 772)

Backend should therefore support:
- audit logging
- secure storage of personal data
- restricted access to candidate contact details
- clear separation between public employer/job data and private applicant data
- deletion/suspension controls where required by business or legal workflows

Backend should store transaction records, not payment card data.
Payment card details should remain with the payment processor (e.g. Paystack), not in platform storage.

---

## 13) Non-Functional Requirements

Minimum expectations:
- input validation on all endpoints
- file validation on document/image uploads
- authorization checks on every protected route
- structured error responses
- secure secrets management
- environment-based configuration
- logging and monitoring
- rate limiting on auth and payment-sensitive routes
- safe file storage strategy for uploaded documents/images
- backup and recovery strategy

---

## 14) Recommended Delivery Order for Backend Work

1. Database schema and migrations
2. Auth and RBAC
3. Employer profile + paid job posting flow
4. Candidate profile + browse jobs
5. Candidate applications + per-application documents
6. Applicant unlock flow
7. Payment verification and webhooks
8. Notifications and status updates
9. Admin, audit, moderation, and reports

---

## 15) Final Integration Scenario the Backend Must Support

Recommended first end-to-end integration test:

1. Employer creates a paid job draft.
2. Backend initiates payment for the selected package.
3. Backend verifies payment server-side.
4. Verified job becomes visible to candidates.
5. Candidate browses visible jobs and opens an active job.
6. Candidate applies with free or premium application.
7. Candidate attaches up to 3 valid application documents.
8. Employer sees the applicant in locked/basic form.
9. Employer pays to unlock the applicant.
10. Backend verifies unlock payment and grants access.
11. Employer accepts or rejects the applicant.
12. Candidate sees the updated application status in My Applications.

If the backend supports that flow cleanly, the platform will be aligned with the current frontend product direction.
