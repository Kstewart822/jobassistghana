# Job Assist Ghana - Frontend Handover Documentation

This document explains the current frontend state of **Job Assist Ghana** so a backend developer or continuing frontend developer can understand what the UI is already doing, what is still simulated in-browser, and what must be replaced with real backend-backed behavior.

---

## 1) Project Overview

Job Assist Ghana is a multi-page web application for connecting candidates with employers.

The repository currently contains:
- public marketing and legal pages
- candidate-facing pages
- employer-facing pages
- payment result pages
- a client-side CV builder
- static HTML/CSS/JavaScript flows that simulate platform behavior

This repo does **not** yet represent a production backend. It is primarily a **frontend prototype / static frontend implementation** with local browser storage used as a temporary stand-in for real persistence.

---

## 2) Current Tech State

- Built with **HTML, CSS, and Vanilla JavaScript**
- No mandatory build step
- Navigation is primarily traditional page-to-page navigation
- Shared behavior is partly embedded in page scripts and partly moved into `assets/js`
- Current persistent state is simulated through:
  - `localStorage`
  - `sessionStorage`

Important:
- local browser storage is currently being used as temporary placeholder state
- it is not a real security boundary
- it must be replaced by backend APIs + database-backed state

---

## 3) High-Level Repo Structure

Main public pages at repo root:
- [index.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/index.html)
- [about.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/about.html)
- [build-cv.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/build-cv.html)
- [signup.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/signup.html)
- [login.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/login.html)
- [employer-signup.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer-signup.html)
- [employer-login.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer-login.html)
- [verify-info.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/verify-info.html)
- [forgot-password.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/forgot-password.html)
- [reset-password.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/reset-password.html)
- [privacy.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/privacy.html)
- [terms.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/terms.html)

Candidate pages:
- [candidate/candidate-dashboard.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/candidate-dashboard.html)
- [candidate/browse-jobs.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/browse-jobs.html)
- [candidate/view-details.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/view-details.html)
- [candidate/your-applications.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/your-applications.html)
- [candidate/candidate-profile.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/candidate-profile.html)
- [candidate/settings.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/settings.html)
- [candidate/boost-profile.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/boost-profile.html)
- [candidate/payment.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/payment.html)
- [candidate/payment-successful.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/payment-successful.html)
- [candidate/payment-failed.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/payment-failed.html)

Employer pages:
- [employer/employer-dashboard.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/employer-dashboard.html)
- [employer/post-job.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/post-job.html)
- [employer/my-job-post.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/my-job-post.html)
- [employer/view-applicants.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/view-applicants.html)
- [employer/boost-job.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/boost-job.html)
- [employer/employer-payment.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/employer-payment.html)
- [employer/epayment-successful.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/epayment-successful.html)
- [employer/epayment-failed.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/epayment-failed.html)
- [employer/esettings.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/esettings.html)

Assets:
- `assets/js`
- `assets/css`
- `assets/img` / similar asset folders where present

Supporting docs:
- [docs/BACKEND_REQUIREMENTS.md](C:/Users/localhost/Downloads/jobassistghana_clean_v1/docs/BACKEND_REQUIREMENTS.md)
- [docs/DOCUMENTATION.md](C:/Users/localhost/Downloads/jobassistghana_clean_v1/docs/DOCUMENTATION.md)
- [docs/NEXT_STEPS.md](C:/Users/localhost/Downloads/jobassistghana_clean_v1/docs/NEXT_STEPS.md)

---

## 4) Current Product Model

### Candidate side
Current frontend behavior reflects this model:
- candidates create accounts and profiles
- candidate profile/passport picture is **optional**
- if no profile image exists, the UI falls back to an initial/avatar based on the candidate's name
- candidates do **not** upload general supporting documents during signup anymore
- supporting documents are attached **per job application**
- a candidate can:
  - browse jobs
  - view job details
  - apply free
  - apply with premium
  - upload up to 3 application-specific documents
  - track applications in **My Applications**
  - boost visibility through paid boost flows

Current candidate application pricing:
- **Free application = GHS 0**
- **Premium application = GHS 50**

Current candidate boost pricing:
- **Professional Boost = GHS 120 for 30 days**
- **Enterprise Boost = GHS 200 for 90 days**

Document rules currently reflected in the UI:
- max 3 documents per application
- allowed types: PDF, DOC, DOCX, JPG, PNG
- max 5MB each
- documents are tied to a specific application, not to the candidate profile

### Employer side
Current frontend behavior reflects this model:
- employers create company/recruiter accounts
- employers post paid jobs
- employers can post:
  - **Standard Job Posting = GHS 300 for 30 days**
  - **Premium Job Posting = GHS 500 for 3 months**
- employers can review applicants for their own jobs
- employers pay to unlock applicant contact details:
  - **Applicant Unlock = GHS 100 per applicant**
- employers can accept or reject applicants
- employer view-applicants page shows application-specific documents, not signup-wide candidate attachments

### Platform positioning
The current UI and legal pages reflect that:
- Job Assist Ghana is a recruitment facilitation platform
- basic candidate applications remain free
- paid candidate services are optional
- paid services do not guarantee employment, interviews, or employer response
- employers must use candidate data only for legitimate recruitment purposes

---

## 5) Current Candidate Flows

### Candidate signup
Relevant pages:
- [signup.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/signup.html)
- [verify-info.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/verify-info.html)

Current behavior:
- public signup step page
- verify-info confirmation step
- optional profile picture upload
- no general supporting documents during signup
- region captured as part of profile
- client-side validation and preview logic handled in-page / shared frontend scripts

### Browse Jobs
Relevant page:
- [candidate/browse-jobs.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/browse-jobs.html)

Current behavior:
- job cards display available jobs
- search and filters apply on the frontend
- pagination is now active
- pagination behavior:
  - mobile: **6 jobs per page**
  - larger screens: responsive per-page counts so too many jobs are not shown at once
- pagination is based on filtered jobs, not the full raw list

### View Job Details + Apply
Relevant page:
- [candidate/view-details.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/view-details.html)

Current behavior:
- candidates can view full job details
- Apply modal supports:
  - free application
  - premium application
  - per-application document upload
- documents are stored against the specific application record
- if no document is attached, the UI now uses a confirmation dialog rather than hard-blocking immediately
- rejected candidates are blocked from reporting that same job; the report action is disabled and the UI shows a warning prompt/toast

### My Applications
Relevant page:
- [candidate/your-applications.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/your-applications.html)

Current behavior:
- candidates can track application records
- statuses can be shown such as:
  - in review
  - accepted
  - rejected
- paid/premium/boost-related status cues exist in the UI

---

## 6) Current Employer Flows

### Employer signup / profile
Relevant pages:
- [employer-signup.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer-signup.html)
- [employer/esettings.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/esettings.html)

Current behavior:
- employer/company profile fields exist for business details
- social links are collected for company context
- frontend should not be interpreted as promising that all social links appear publicly on job cards

### Job posting
Relevant pages:
- [employer/post-job.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/post-job.html)
- [employer/employer-payment.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/employer-payment.html)
- [employer/my-job-post.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/my-job-post.html)

Current behavior:
- employers choose a job package
- payment-related pages simulate activation and success/failure flows
- expired/closed jobs remain visible to employer in My Job Posts
- expired/closed jobs should not be boostable

### View applicants
Relevant page:
- [employer/view-applicants.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/view-applicants.html)

Current behavior:
- employers view only applicants for a selected job
- contact details remain locked until unlock payment
- applicant documents shown are application-specific
- document display is compact:
  - `pdf1`
  - `doc1`
  - `docx1`
  - `jpg1`
  - `png1`
- clicking a compact document label opens/previews the file
- download is handled from the preview area/modal
- applicant search/filter UI exists in the page

### Employer notifications
Relevant pages:
- [employer/employer-dashboard.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/employer-dashboard.html)
- [employer/my-job-post.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/my-job-post.html)

Current behavior:
- notification wording has been updated to avoid exposing applicant names in preview text
- neutral examples:
  - `You have a new applicant.`
  - `{Job Title} has a new applicant.`

---

## 7) Current Payment-Related Frontend Behavior

Candidate payment pages:
- [candidate/payment.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/payment.html)
- [candidate/payment-successful.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/payment-successful.html)
- [candidate/payment-failed.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/candidate/payment-failed.html)

Employer payment pages:
- [employer/employer-payment.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/employer-payment.html)
- [employer/epayment-successful.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/epayment-successful.html)
- [employer/epayment-failed.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/employer/epayment-failed.html)

Current behavior:
- success and failed pages exist for both candidate and employer flows
- payment result cards were recently compacted for a cleaner desktop/mobile display
- the frontend simulates payment completion state

Critical backend note:
- the backend must **not** trust frontend payment amounts, package type, duration, expiry, or success state
- backend must verify payments server-side before activating:
  - job postings
  - premium applications
  - applicant unlocks
  - boosts

---

## 8) Current State Management Reality

Current frontend state uses browser storage for placeholder persistence, such as:
- current user/candidate/employer session details
- job drafts and posted jobs
- candidate applications
- notification lists
- payment status placeholders
- profile data

This is a temporary frontend-only simulation.

When a backend is connected:
- browser storage must stop being the source of truth
- real state must come from authenticated backend APIs and database records

---

## 9) Legal / Policy State

The public legal pages have already been updated to match the current product model:
- [privacy.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/privacy.html)
- [terms.html](C:/Users/localhost/Downloads/jobassistghana_clean_v1/terms.html)

Current policy position now reflects:
- optional candidate profile picture
- candidate profile information
- per-application document uploads
- employer/company profile information
- third-party payment handling (for example Paystack)
- Ghana-focused privacy/compliance wording
- free basic applications
- optional paid premium applications and other paid services
- no guaranteed job, hire, interview, or employer response
- good-faith report requirements

Backend implementation should stay aligned with those legal statements.

---

## 10) What the Backend Must Replace First

The current frontend behaves as if the following already exist, but they are still simulated:
- authentication
- role-aware sessions
- candidate profiles
- employer/company profiles
- paid job posting activation
- candidate-visible job filtering
- applications
- application-specific document storage
- applicant unlocks
- payment verification
- notifications
- audit/security logic

The backend must replace the browser-only simulation with:
- database persistence
- protected APIs
- file storage
- server-side validations
- payment verification
- role/ownership checks

---

## 11) Recommended First End-to-End Integration Flow

The cleanest first integration path is:

1. Employer creates a job draft.
2. Backend initiates and verifies job posting payment.
3. Backend marks the job active and visible to candidates.
4. Candidate browses jobs from the backend list.
5. Candidate applies with free or premium application.
6. Candidate attaches up to 3 application-specific documents.
7. Employer views applicant in locked/basic form.
8. Employer pays to unlock the applicant.
9. Backend verifies unlock payment and grants access.
10. Employer accepts or rejects the candidate.
11. Candidate sees the updated status in My Applications.

That flow matches the current frontend direction and should guide backend handover priorities.

---

## 12) Developer Notes / Cautions

- Do not treat current localStorage/sessionStorage fields as a production schema.
- Some current page logic still exists inline and may need careful API retrofitting.
- Payment success pages are display pages, not proof of verified payment.
- Application documents are now per-application; do not recreate the old signup-level attachment model.
- Candidate avatar fallback is initials when no image is present; backend should not force face placeholders.
- Candidate- and employer-facing visibility rules must move server-side during integration.

This document should be used together with:
- [docs/BACKEND_REQUIREMENTS.md](C:/Users/localhost/Downloads/jobassistghana_clean_v1/docs/BACKEND_REQUIREMENTS.md)
- [docs/NEXT_STEPS.md](C:/Users/localhost/Downloads/jobassistghana_clean_v1/docs/NEXT_STEPS.md)
