# Mongoose Schema Design Documentation

## Overview
This document provides comprehensive documentation for all Mongoose schemas in the JobAssist application, including their design patterns, relationships, indexes, constraints, and scaling recommendations.

---

## 1. Schema Relationships Diagram

```
User (Base Identity)
├── CandidateProfile (1:1)
├── EmployerProfile (1:1)
├── Job (1:N - employer creates jobs)
├── Application (1:N - candidate applies)
├── ApplicationDocument (1:N)
├── ApplicantUnlock (1:N - candidate unlocks info)
├── Payment (1:N - user makes payments)
├── Boost (1:N - user boosts content)
├── Notification (1:N - user receives)
├── Report (1:N - user reports/reported)
└── AuditLog (1:N - user actions logged)

Job
├── Application (1:N)
├── ApplicationDocument (1:N - through Application)
├── Boost (1:1)
└── Payment (1:N - through Boost/Feature)

Application
├── ApplicationDocument (1:N - max 3)
├── ApplicantUnlock (1:N)
└── Notification (1:N)
```

---

## 2. Critical Constraints Implementation

### 2.1 Prevent Duplicate Applications
**Schema:** Application
**Implementation:** Compound unique index on `(candidateId, jobId, deletedAt)`

```javascript
applicationSchema.index(
  { candidateId: 1, jobId: 1, deletedAt: 1 },
  { unique: true, sparse: true }
);
```

**Pre-save Validation:**
- Checks existing applications before save
- Throws 409 Conflict error if duplicate found
- Soft delete strategy allows re-apply after withdrawal

### 2.2 Maximum 3 Documents Per Application
**Schema:** ApplicationDocument
**Implementation:** 
- Field: `documentCount` (max: 3) on Application
- Pre-save validation in ApplicationDocument
- Incremental count management

### 2.3 Enforce Allowed MIME Types
**Schema:** ApplicationDocument
**Implementation:**
```javascript
fileType: {
  type: String,
  enum: ALLOWED_MIME_TYPES
}
// Only: PDF, JPEG, PNG, GIF, DOC, DOCX
```

**Pre-save Validation:** Validates against whitelist

### 2.4 Enforce File Size Limits
**Schema:** ApplicationDocument
**Implementation:**
```javascript
fileSize: {
  type: Number,
  validate: { validator: value => value <= 10MB }
}
```

### 2.5 Prevent Invalid Payment Activation
**Schema:** Payment
**Implementation:**
```javascript
pre('save'): {
  - Validates amount > 0
  - Sets completedAt on status='completed'
  - Validates payment method matches provider
}
```

### 2.6 Prevent Employers from Accessing Non-Owned Jobs
**Implementation Strategy:**
- Field: `employerId` on Job schema (indexed)
- Service layer validates: `job.employerId === req.user.id`
- RBAC middleware: `requireOwnership('employerId')`

### 2.7 Prevent Candidates from Applying to Invalid Jobs
**Implementation Strategy:**
- Pre-application validation:
  - Job status must be 'active'
  - Job must not be expired (expiresAt > now)
  - Candidate must be verified (if required by employer)
  - Candidate must not have existing application

---

## 3. Detailed Schema Analysis

### 3.1 CandidateProfile Schema

**Purpose:** Extended profile data for candidates

**Key Features:**
- Soft delete support (deletedAt)
- Geospatial indexing for location-based search
- Premium tier support with expiration
- Skill endorsements
- Education & certifications
- Profile completeness tracking (0-100%)
- Visibility levels (Public/Private/Limited)
- Boost integration

**Critical Indexes:**
```javascript
{ userId: 1, deletedAt: 1 } // Primary lookup
{ 'location.coordinates': '2dsphere' } // Geo search
{ profileCompleteness: 1, deletedAt: 1 } // Profile quality search
{ isPremium: 1, premiumExpiresAt: 1 } // Premium filtering
```

**Pagination Ready:** Yes - includes `createdAt` index for cursor-based pagination

---

### 3.2 EmployerProfile Schema

**Purpose:** Extended profile for employers/companies

**Key Features:**
- Company verification workflow
- Team member management (multiple recruiters)
- Verification documents storage
- Office locations (multiple)
- Industry classification
- Subscription plans (free/starter/professional/enterprise)
- Application statistics tracking
- Boost integration

**Critical Indexes:**
```javascript
{ companyName: 1, deletedAt: 1 } // Company search
{ verificationStatus: 1, deletedAt: 1 } // Verified employers filter
{ subscriptionPlan: 1, deletedAt: 1 } // Plan-based filtering
{ 'location.coordinates': '2dsphere' } // Location search
```

**Compound Indexes:**
- `verificationStatus + deletedAt + verifiedAt` - Verified employers
- `isPremium + premiumExpiresAt + deletedAt` - Premium employers

---

### 3.3 Job Schema

**Purpose:** Job postings with comprehensive details

**Key Features:**
- Full-text search support (title, description, category)
- Geospatial indexing
- Skill requirements with proficiency levels
- Custom application questions
- Status workflow (draft → active → closed → archived)
- Featured/Highlighted/Boosted variants
- Application threshold (prevents underqualified applications)
- Expiration workflow
- Application statistics
- Tag-based categorization

**Text Search Index:**
```javascript
{ title: 'text', description: 'text', category: 'text' }
```

**Critical Indexes:**
```javascript
{ employerId: 1, status: 1, deletedAt: 1 } // Employer's jobs
{ status: 1, publishedAt: -1, deletedAt: 1 } // Active jobs
{ 'location.remote': 1, experienceLevel: 1, jobType: 1 } // Job matching
{ category: 1, status: 1, deletedAt: 1 } // Category browsing
```

**Query Helpers:**
- `.active()` - Status='active' + not deleted
- `.available()` - Active + not expired

---

### 3.4 Application Schema

**Purpose:** Job application tracking with workflow

**Key Features:**
- **CRITICAL:** Unique compound index prevents duplicates
- Multi-stage workflow (screening → interview → offer)
- Custom answer storage
- Interview scheduling
- Feedback collection
- Offer details & expiration
- Rejection tracking with reasons
- Shortlisting workflow
- Tag-based organization
- Unlock integration (premium feature)
- Soft delete support

**Duplicate Prevention:**
```javascript
applicationSchema.index(
  { candidateId: 1, jobId: 1, deletedAt: 1 },
  { unique: true, sparse: true }
);
```

**Critical Indexes:**
```javascript
{ candidateId: 1, status: 1, deletedAt: 1 } // Candidate's applications
{ employerId: 1, status: 1, deletedAt: 1 } // Employer's received apps
{ jobId: 1, status: 1, deletedAt: 1 } // Job's applications
{ status: 1, stage: 1, createdAt: -1, deletedAt: 1 } // Pipeline view
```

---

### 3.5 ApplicationDocument Schema

**Purpose:** Document storage for applications

**Key Features:**
- **CRITICAL:** 3-document maximum per application
- **CRITICAL:** Mime-type whitelist enforcement
- **CRITICAL:** File size limit (10MB)
- Virus scan integration
- Document verification workflow
- Access logging (compliance)
- Download tracking
- Expiration support
- Public/private visibility
- S3 metadata storage

**Pre-save Validations:**
```javascript
1. Document count <= 3
2. File size <= 10MB
3. MIME type in whitelist
4. File uniqueness (fileKey unique index)
```

**Allowed MIME Types:**
- application/pdf
- image/jpeg, image/png, image/gif
- application/msword
- application/vnd.openxmlformats-officedocument.wordprocessingml.document

---

### 3.6 ApplicantUnlock Schema

**Purpose:** Premium feature to unlock employer contact information

**Key Features:**
- **CRITICAL:** Unique compound index prevents duplicate unlocks
- Unlock types (contact_info, employer_details, salary_details)
- Payment integration
- Expiration workflow
- Status tracking (pending → completed → failed)
- Access logging
- Refund support
- Failed unlock handling

**Duplicate Prevention:**
```javascript
applicantUnlockSchema.index(
  { applicationId: 1, candidateId: 1, unlockType: 1, deletedAt: 1 },
  { unique: true, sparse: true }
);
```

---

### 3.7 Payment Schema

**Purpose:** Transaction and payment tracking

**Key Features:**
- Multiple payment methods (card, PayPal, bank transfer, etc.)
- Multiple providers (Stripe, PayPal, Flutterwave)
- Transaction tracking
- Fraud detection integration
- Receipt management
- Refund workflow
- Retry mechanism
- Status tracking (pending → processing → completed/failed)
- Exchange rate for currency conversion
- Comprehensive error tracking

**Payment Types:**
- job_posting
- boost
- premium_subscription
- highlight
- applicant_unlock
- feature_access
- custom

**Status Workflow:**
```
pending → processing → completed ✓
                    → failed ✗
                    → refunded
                    → partial_refund
cancelled
```

---

### 3.8 Boost Schema

**Purpose:** Content promotion/boosting system

**Key Features:**
- Boost types (job posting, candidate profile)
- Duration tracking
- Priority levels (low, medium, high, premium)
- Analytics (impressions, clicks, CTR, conversions)
- Auto-renewal support
- Pause/Resume capability
- Pause history tracking
- Expiration tracking
- Refund integration
- Status workflow (active → expired → cancelled)

**Auto-calculated Fields:**
- CTR = (clicks / impressions) × 100
- Conversion Rate = (applications / impressions) × 100

**Query Helpers:**
- `.active()` - Checks expiresAt > now
- `.expiringSoon(days)` - Expiring within N days

---

### 3.9 Notification Schema

**Purpose:** Multi-channel notification delivery

**Key Features:**
- 15 notification types
- Multi-channel delivery (in-app, email, SMS, push)
- Channel-specific status tracking
- Scheduling support
- Read/Archive/Delete status
- Priority levels
- Retry mechanism
- Analytics (clicked, action taken)
- Campaign tagging
- Soft delete support

**Notification Types:**
- application_received
- application_status_changed
- interview_scheduled
- offer_received
- job_match
- profile_viewed
- message_received
- payment_confirmation
- boost_expired
- job_closed

**Channel Status Tracking:**
```javascript
channels: {
  inApp: { enabled, sent, sentAt },
  email: { enabled, sent, sentAt, bounced },
  sms: { enabled, sent, sentAt },
  push: { enabled, sent, sentAt }
}
```

---

### 3.10 Report Schema

**Purpose:** Content moderation and abuse reporting

**Key Features:**
- 10 report types
- Severity levels (low, medium, high, critical)
- Investigation workflow
- Assignment to moderators
- Appeal process
- Action tracking (warning, suspend, ban)
- Duplicate report linking
- Internal notes & comments
- Resolution tracking
- Compliance support

**Status Workflow:**
```
pending → under_review → investigating → resolved ✓
                                      → dismissed ✗
                                      → escalated
```

**Report Types:**
- user_behavior, job_posting, inappropriate_content
- fraud, spam, harassment, discrimination
- fake_profile, scam, other

---

### 3.11 AuditLog Schema

**Purpose:** Comprehensive system audit trail

**Key Features:**
- Action tracking (create, read, update, delete, login, etc.)
- Module categorization (11 modules)
- Old/New value comparison
- Changed fields tracking
- IP address & user agent tracking
- Response code & duration
- Error tracking with stack traces
- Geographic location tracking
- Compliance marking
- TTL index for automatic log rotation
- Severity levels

**Action Types:**
- create, read, update, delete
- login, logout, export, import
- payment, admin_action

**Modules:**
- auth, user, profile, job, application
- payment, boost, notification, report
- admin, system

**Compliance Features:**
- Auto-marked for sensitive actions
- Retention period tracking
- Compliance-relevant filtering

---

## 4. Index Optimization Strategy

### 4.1 Index Categories

**Type 1: Primary Lookups**
```javascript
// Fast single-document retrieval
{ userId: 1, deletedAt: 1 }
{ applicationId: 1, deletedAt: 1 }
{ jobId: 1, deletedAt: 1 }
```

**Type 2: Filtering Queries**
```javascript
// Status, type, visibility filtering
{ status: 1, deletedAt: 1 }
{ type: 1, status: 1, deletedAt: 1 }
{ visibility: 1, status: 1, deletedAt: 1 }
```

**Type 3: Sorting/Pagination**
```javascript
// For cursor-based pagination
{ createdAt: -1, deletedAt: 1 }
{ updatedAt: -1, status: 1, deletedAt: 1 }
```

**Type 4: Compound Queries**
```javascript
// Multiple conditions in common queries
{ userId: 1, status: 1, createdAt: -1, deletedAt: 1 }
{ employerId: 1, status: 1, publishedAt: -1, deletedAt: 1 }
```

**Type 5: Search Indexes**
```javascript
// Text and geospatial
{ title: 'text', description: 'text', category: 'text' }
{ 'location.coordinates': '2dsphere' }
```

### 4.2 Index Size Estimates

```
CandidateProfile: ~8-10 indexes (120-150 KB per 1000 docs)
EmployerProfile: ~9-11 indexes (140-170 KB per 1000 docs)
Job: ~12-14 indexes (180-220 KB per 1000 docs)
Application: ~8-10 indexes (120-150 KB per 1000 docs)
ApplicationDocument: ~7-9 indexes (100-130 KB per 1000 docs)
ApplicantUnlock: ~7-9 indexes (100-130 KB per 1000 docs)
Payment: ~11-13 indexes (160-200 KB per 1000 docs)
Boost: ~8-10 indexes (120-150 KB per 1000 docs)
Notification: ~10-12 indexes (150-180 KB per 1000 docs)
Report: ~11-13 indexes (160-200 KB per 1000 docs)
AuditLog: ~13-15 indexes (190-240 KB per 1000 docs)
```

### 4.3 Query Performance Targets

**Expected Query Times (with proper indexes):**
- Single document lookup: < 1ms
- Filtered list (1 condition): < 5ms
- Filtered list (3 conditions): < 10ms
- Text search: < 50ms
- Geospatial search: < 20ms
- Aggregation pipeline: < 100ms

---

## 5. Soft Delete Strategy

### Implementation Pattern

All schemas include:
```javascript
deletedAt: {
  type: Date,
  default: null,
  sparse: true,
  index: true
}
```

**All indexes include deletedAt:**
```javascript
{ field: 1, deletedAt: 1 } // Compound index
```

**Query helpers for soft delete:**
```javascript
schema.query.active = function() {
  return this.where({ deletedAt: null });
};
```

**Usage in queries:**
```javascript
// Automatic in most query helpers
Model.find({ status: 'active', deletedAt: null })
Model.active().where({ status: 'active' })

// For cascade soft-deletes
await Application.updateMany(
  { jobId: jobId },
  { deletedAt: new Date() }
);
```

---

## 6. Pagination Strategy

### Cursor-Based Pagination (Recommended)

**Implementation:**
```javascript
// Forward pagination
const docs = await Model.find({ createdAt: { $gt: lastCursor }, deletedAt: null })
  .sort({ createdAt: -1 })
  .limit(pageSize)
  .select(fieldsToReturn);

// Backward pagination
const docs = await Model.find({ createdAt: { $lt: firstCursor }, deletedAt: null })
  .sort({ createdAt: 1 })
  .limit(pageSize)
  .select(fieldsToReturn);
```

**Advantages:**
- Handles real-time insertions well
- O(1) pagination complexity
- No offset issues
- Efficient database queries

### Sort Options Per Schema

**CandidateProfile:**
- `createdAt` (newest first)
- `profileCompleteness` (most complete first)
- `boost.lastBoostedAt` (recently boosted first)

**Job:**
- `publishedAt` (newest first)
- `createdAt` (newest first)
- `views` (most viewed first)

**Application:**
- `createdAt` (newest first)
- `lastInteractionAt` (recent activity first)
- `shortlistedAt` (recent shortlist first)

---

## 7. Relationship Optimization

### 3.1 Reference Strategy

**Sparse Foreign Keys:**
```javascript
// For optional relationships
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  sparse: true
}
```

**Indexed Foreign Keys:**
```javascript
// For frequently queried relationships
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
  index: true
}
```

### 3.2 Embedding vs Reference Decisions

**Embedded (Not Referenced):**
- Short arrays of related data
- Data that changes rarely
- Example: Education array in CandidateProfile

**Referenced:**
- Large documents
- Many-to-many relationships
- Frequently updated data
- Example: Job → Application relationship

**Hybrid Approach (Data Duplication):**
- Duplicate critical data for read performance
- Example: Store `jobTitle` and `companyName` in Application (from Job) for quick display
- Sync via post-save hooks in service layer

---

## 8. Unique Constraints Summary

| Constraint | Schema | Fields | Sparse | Purpose |
|-----------|--------|--------|--------|---------|
| User Email | User | email | No | Email uniqueness |
| Slug | Job | slug | No | SEO-friendly URL |
| File Key | ApplicationDocument | fileKey | No | Cloud storage reference |
| Transaction ID | Payment | transactionId | No | Payment uniqueness |
| Provider Trans ID | Payment | providerTransactionId | Yes | 3rd-party reference |
| Candidate+Job | Application | (candidateId, jobId, deletedAt) | Yes | Prevent duplicate applications |
| Candidate+Type | ApplicantUnlock | (applicationId, candidateId, unlockType, deletedAt) | Yes | Prevent duplicate unlocks |

---

## 9. Scaling Recommendations

### 9.1 Short-term (0-100K documents)

1. **Maintain current indexing strategy**
2. **Monitor query patterns** - Use MongoDB profiler
3. **Implement caching layer** for:
   - Job listings (cache for 1 hour)
   - User profiles (cache for 24 hours)
   - Popular categories (cache for 1 hour)

### 9.2 Medium-term (100K-1M documents)

1. **Shard by:**
   - Primary: `userId` (hash)
   - Fallback: `jobId` (range) for large Job collections

2. **Archive old records:**
   ```javascript
   // Archive reports > 1 year old
   // Archive audit logs > 90 days old
   // Archive expired applications > 6 months old
   ```

3. **Implement read replicas** for reporting queries

4. **Consider denormalization:**
   - Store application count on Job (update on app insert)
   - Store user stats on User (update via background job)

### 9.3 Large-scale (1M+ documents)

1. **Time-series collections** for analytics
2. **Separate analytics database** for reporting
3. **Event streaming** (Kafka) for real-time analytics
4. **Multi-region replication** for geo-redundancy
5. **Connection pooling** (increase pool size to 50+)

---

## 10. Performance Tuning Checklist

- [ ] Run `db.collection.validate()` monthly
- [ ] Monitor index usage: `db.collection.aggregate([{$indexStats}])`
- [ ] Remove unused indexes
- [ ] Monitor query performance with APM
- [ ] Test pagination with large datasets
- [ ] Benchmark geospatial queries
- [ ] Test soft delete performance (query count)
- [ ] Monitor compound index effectiveness
- [ ] Regular backup and recovery testing
- [ ] Load test with realistic data volumes

---

## 11. Data Type Decisions

### Numbers
- **IDs:** ObjectId (Mongoose default)
- **Counts:** Number (safe to ~9 quintillion)
- **Prices:** Number (store in cents for precision)
- **Ratings:** Number (1-5)
- **Percentages:** Number (0-100)
- **Coordinates:** [longitude, latitude] for GeoJSON

### Strings
- **Emails:** Lowercase, unique, indexed
- **URLs:** Trim whitespace, validate format
- **Phone:** Store raw format, validate client-side
- **Text fields:** Set max length (1000, 2000, 5000)

### Dates
- **Timestamps:** UTC, default to Date.now
- **Soft delete:** Store Date, use sparse index
- **Expiration:** Compare with new Date() for active checks

---

## 12. Migration Strategy

**For scaling deployments:**

1. **Add new index:** `db.collection.createIndex()`
2. **Let index build** (non-blocking by default)
3. **Monitor build progress:** `db.currentOp()`
4. **Drop old index** when new is ready

**For schema changes:**

1. **Add field with null default**
2. **Backfill using background job**
3. **Update application code**
4. **Deploy to production**
5. **Monitor field usage**
6. **Remove field if unused (rare)**

---

## Summary

This schema design provides:
- ✅ Enterprise-grade data integrity
- ✅ Scalable query performance
- ✅ Comprehensive audit trails
- ✅ Flexible soft-delete strategy
- ✅ Multi-level constraints for data validation
- ✅ Pagination-ready structure
- ✅ Future scaling path
- ✅ Compliance support
