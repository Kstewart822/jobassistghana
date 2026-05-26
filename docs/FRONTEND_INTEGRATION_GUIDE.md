# Frontend-Backend Integration Strategy

## Overview
This document outlines the strategy to integrate the Job Assist Ghana frontend with the backend API.

## Current State

### Frontend
- **Architecture**: Pure HTML/CSS/JavaScript (no framework)
- **Session Management**: LocalStorage-based (key: `jobassist_current_user`)
- **Authentication**: Local validation only (phone/password for candidates, email/password for employers)
- **Forms**: Multi-step forms with client-side validation

### Backend
- **API Base URL**: `http://localhost:5000/api`
- **Authentication**: JWT-based (Bearer tokens)
- **User Types**: Candidate (role: 'candidate'), Employer (role: 'employer'), Admin (role: 'admin')
- **Token Expiry**: 24h access token, 7d refresh token

## API Integration Module

A new **api-integration.js** file has been created with the following structure:
- **Auth** endpoints: register, login, logout, profile, changePassword, refreshToken, forgotPassword, resetPassword
- **Jobs** endpoints: list, search, getById, create, update, publish, close, delete
- **Applications** endpoints: submit, getMyApplications, withdraw, updateStatus, scheduleInterview
- **Utils**: Auth checks, token management, logout handler

## Integration Plan

### Phase 1: Authentication System
**Files to Update:**
1. `login.html` - ✅ DONE
2. `signup.html` - IN PROGRESS
3. `employer-login.html` - TODO
4. `employer-signup.html` - TODO
5. `forgot-password.html` - TODO
6. `reset-password.html` - TODO

**Key Changes:**
- Replace local authentication with API calls
- Store JWT tokens in localStorage (keys: `jobassist_access_token`, `jobassist_refresh_token`)
- Store user info in localStorage (key: `jobassist_user`)
- Implement token refresh on 401 responses
- Redirect to appropriate dashboard on successful login

### Phase 2: Dashboard & Profile
**Files to Update:**
1. `candidate/candidate-dashboard.html`
2. `candidate/settings.html`
3. `candidate/candidate-profile.html`
4. `employer/employer-dashboard.html`
5. `employer/esettings.html`

**Key Changes:**
- Load user data from API on page load
- Implement logout functionality
- Add profile update forms with API integration
- Implement password change forms

### Phase 3: Job Posting (Employer)
**Files to Update:**
1. `employer/post-job.html`
2. `employer/my-job-post.html`
3. `employer/boost-job.html`

**Key Changes:**
- Create job posting form that submits to `/jobs` endpoint
- Load employer's jobs from `/jobs/employer/{employerId}` endpoint
- Implement job editing and publishing
- Handle file uploads for job attachments

### Phase 4: Job Browsing (Candidate)
**Files to Update:**
1. `candidate/browse-jobs.html`
2. `candidate/view-details.html`

**Key Changes:**
- Load jobs from `/jobs/search` endpoint with filters
- Implement pagination
- Display job details with API data
- Track application status

### Phase 5: Applications
**Files to Update:**
1. `candidate/your-applications.html`
2. `employer/view-applicants.html`
3. Form submission in job details page

**Key Changes:**
- Submit applications to `/applications` endpoint
- Load candidate applications from `/applications/me` endpoint
- Load employer applications from `/applications/employer` endpoint
- Update application status through API
- Implement interview scheduling

### Phase 6: Additional Features
**Files to Update:**
1. `candidate/boost-profile.html`
2. `candidate/payment.html`
3. `employer/employer-payment.html`
4. `candidate/report.html`

**Key Changes:**
- Integrate payment gateway with backend
- Implement report functionality
- Handle boost/payment status

## Token Management Strategy

```javascript
// Token storage
localStorage.setItem('jobassist_access_token', accessToken);
localStorage.setItem('jobassist_refresh_token', refreshToken);
localStorage.setItem('jobassist_user', JSON.stringify(user));

// Authorization header
Authorization: `Bearer ${accessToken}`

// On 401 response
- Clear tokens and user data
- Redirect to appropriate login page
- Require re-authentication
```

## Error Handling Strategy

### Error Response Format
```javascript
{
  success: false,
  status: 400|401|403|404|500,
  message: "Error description",
  errors: { field: ["error message"] }, // Validation errors
  data: {} // Full response data if needed
}
```

### Client-side Handling
1. **Validation Errors (400)**: Display field-specific errors below inputs
2. **Authentication Errors (401)**: Redirect to login
3. **Authorization Errors (403)**: Show "Access Denied" message
4. **Not Found (404)**: Show "Resource not found" message
5. **Server Errors (500)**: Show "Something went wrong" with retry option

## Form Integration Pattern

### Step 1: HTML Form Setup
```html
<form id="myForm">
  <input id="field1" type="text" />
  <div id="field1Error" class="field-error"></div>
  <button type="submit">Submit</button>
</form>
```

### Step 2: JavaScript Handler
```javascript
const form = document.getElementById('myForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Collect data
  const data = {
    field1: document.getElementById('field1').value
  };
  
  // Call API
  const result = await window.JobAssistAPI.SomeModule.someMethod(data);
  
  if (result.success) {
    // Handle success
    window.location.href = 'next-page.html';
  } else {
    // Show errors
    if (result.errors?.field1) {
      showError('field1Error', result.errors.field1[0]);
    }
  }
});
```

## Authentication Flow

### Candidate Login
```
1. User enters email/password
2. Call POST /auth/login
3. Store accessToken, refreshToken, user in localStorage
4. Redirect to candidate/candidate-dashboard.html
```

### Employer Login
```
1. User enters email/password
2. Call POST /auth/login
3. Store accessToken, refreshToken, user in localStorage
4. Redirect to employer/employer-dashboard.html
```

### Candidate Signup
```
1. User fills form (Step 1)
2. Submit to verify-info.html (Step 2)
3. Verify additional info
4. Call POST /auth/register with full data
5. Redirect to login or auto-login
```

### Token Refresh
```
1. Make API request
2. If 401 response:
   - Call POST /auth/refresh-token with refreshToken
   - Store new accessToken
   - Retry original request
   - If refresh fails, redirect to login
```

## Session Persistence Strategy

### On Page Load
```javascript
document.addEventListener('DOMContentLoaded', () => {
  const user = window.JobAssistAPI.getCurrentUser();
  const token = window.JobAssistAPI.getAccessToken();
  
  if (!user || !token) {
    // Redirect to login if accessing protected page
    window.location.href = '/login.html';
    return;
  }
  
  // Load page with authenticated user
});
```

### Protected Pages
- All pages under `/candidate/` - require candidate role
- All pages under `/employer/` - require employer role
- `/candidate/candidate-dashboard.html` - require authentication
- `/employer/employer-dashboard.html` - require authentication

### Public Pages
- `/index.html` - home
- `/login.html` - candidate login
- `/employer-login.html` - employer login
- `/signup.html` - candidate signup
- `/employer-signup.html` - employer signup
- `/forgot-password.html` - forgot password
- `/reset-password.html` - reset password

## Implementation Checklist

### Phase 1: Authentication
- [x] Create api-integration.js
- [x] Update login.html to use API
- [ ] Update signup.html for Step 1
- [ ] Update verify-info.html for Step 2 (register)
- [ ] Update employer-login.html
- [ ] Update employer-signup.html
- [ ] Update forgot-password.html
- [ ] Update reset-password.html

### Phase 2: Dashboards
- [ ] Update candidate-dashboard.html
- [ ] Update employer-dashboard.html
- [ ] Add logout functionality
- [ ] Load user profile data

### Phase 3: Job Management
- [ ] Update post-job.html
- [ ] Update my-job-post.html
- [ ] Update browse-jobs.html
- [ ] Update view-details.html

### Phase 4: Applications
- [ ] Update your-applications.html
- [ ] Update view-applicants.html
- [ ] Implement application submission

### Phase 5: Additional Pages
- [ ] Update remaining pages

## Known Considerations

### Multi-step Forms
Some forms (signup) are multi-step. Current approach:
1. Step 1 (signup.html): Validate and store data
2. Step 2 (verify-info.html): Final verification
3. Submit to API with complete data

Alternative approach:
1. Submit to API at each step
2. API returns partial confirmation
3. Easier to save progress, harder for frontend

### File Uploads
- Profile pictures in signup: Max 2MB, PNG/JPG
- Job attachments: Handle via multipart/form-data
- Need to update API integration to handle file uploads

### Validation
- Backend validates all inputs
- Frontend provides immediate feedback
- Backend returns validation errors if frontend validation bypassed

## Testing Strategy

1. **Unit Tests**: Test individual form submissions
2. **Integration Tests**: Test complete flows (login → browse → apply)
3. **Error Scenarios**: Test API failures, network timeouts
4. **Session Tests**: Test token expiry and refresh
5. **Role-based Access**: Test employer vs candidate views

## Rollback Plan

If API integration fails:
1. Revert to previous version of HTML files
2. No database changes needed (reading only)
3. Keep api-integration.js for future use

## Next Steps

1. Update signup.html for multi-step registration
2. Update employer login pages
3. Update dashboard pages with user data
4. Implement job posting and browsing
5. Implement application submission
6. End-to-end testing across full workflow
