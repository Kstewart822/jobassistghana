(function () {
  const APPLICATIONS_KEY = "jobassist_applications";
  const PAYMENT_ACTIONS_KEY = "jobassist_payment_actions";

  function safeJSONParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function toTrimmedString(value) {
    return String(value || "").trim();
  }

  function sanitizeTextValue(value, maxLength) {
    if (window.JobAssistInputHardening?.sanitizeText) {
      return window.JobAssistInputHardening.sanitizeText(value, { maxLength: maxLength || 0 });
    }
    return toTrimmedString(value);
  }

  function sanitizeMultilineValue(value, maxLength) {
    if (window.JobAssistInputHardening?.sanitizeMultilineText) {
      return window.JobAssistInputHardening.sanitizeMultilineText(value, { maxLength: maxLength || 0 });
    }
    return toTrimmedString(value);
  }

  function normalizeApplicationDocuments(value) {
    return (Array.isArray(value) ? value : [])
      .map(function (document) {
        return {
          name: sanitizeTextValue(document?.name, 180),
          type: sanitizeTextValue(document?.type, 120),
          size: Number(document?.size || 0),
          dataUrl: toTrimmedString(document?.dataUrl || document?.url),
        };
      })
      .filter(function (document) {
        return (
          document.name &&
          document.type &&
          Number.isFinite(document.size) &&
          document.size > 0 &&
          document.dataUrl
        );
      })
      .slice(0, 3);
  }

  function normalizeStatusValue(status, application) {
    const normalized = toTrimmedString(status || application?.status).toLowerCase();

    if (
      normalized === "accepted" ||
      application?.accepted === true ||
      application?.offerAccepted === true
    ) {
      return "accepted";
    }

    if (
      normalized === "rejected" ||
      normalized === "withdrawn" ||
      application?.rejected === true ||
      application?.withdrawn === true
    ) {
      return "rejected";
    }

    return "in-review";
  }

  function normalizeDateApplied(value, fallbackIsoString) {
    const rawValue = toTrimmedString(value || fallbackIsoString);
    if (!rawValue) return "";

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
      return rawValue.slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  function normalizeApplicationPriority(value, record) {
    const direct = toTrimmedString(value || record?.applicationPriority || record?.boostType).toLowerCase();
    const serviceBoostType = toTrimmedString(record?.boostTier).toLowerCase();

    if (direct === "enterprise" || serviceBoostType === "boost-enterprise") {
      return "enterprise";
    }

    if (direct === "professional" || serviceBoostType === "boost-pro") {
      return "professional";
    }

    if (
      direct === "premium" ||
      direct === "basic" ||
      serviceBoostType === "boost-basic" ||
      Boolean(record?.isPremium) ||
      toTrimmedString(record?.tier).toLowerCase() === "premium" ||
      toTrimmedString(record?.status).toLowerCase() === "premium_verified" ||
      toTrimmedString(record?.status).toLowerCase() === "pending_payment"
    ) {
      return "premium";
    }

    return "normal";
  }

  function getPaymentActions() {
    const parsed = safeJSONParse(localStorage.getItem(PAYMENT_ACTIONS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  }

  function isPremiumApplicationRecord(record) {
    const boostTier = toTrimmedString(record?.boostTier).toLowerCase();
    if (boostTier) return false;

    const tier = toTrimmedString(record?.tier).toLowerCase();
    const paymentServiceType = toTrimmedString(record?.paymentServiceType).toLowerCase();

    return paymentServiceType === "application-premium" || Boolean(record?.isPremium) || tier === "premium";
  }

  function getRelatedPremiumPaymentStatus(record) {
    const applicationId = toTrimmedString(record?.applicationId || record?.id);
    const candidateId = toTrimmedString(record?.candidateId);
    const jobId = toTrimmedString(record?.jobId);

    if (!applicationId && !(candidateId && jobId)) return "";

    const latestMatch = getPaymentActions()
      .filter(function (action) {
        if (toTrimmedString(action?.serviceType).toLowerCase() !== "application-premium") {
          return false;
        }

        const actionApplicationId = toTrimmedString(action?.applicationId || action?.applicantId);
        if (applicationId && actionApplicationId) {
          return actionApplicationId === applicationId;
        }

        return (
          candidateId &&
          jobId &&
          toTrimmedString(action?.candidateId) === candidateId &&
          toTrimmedString(action?.jobId) === jobId
        );
      })
      .sort(function (a, b) {
        const aTime = Date.parse(a?.updatedAt || a?.failedAt || a?.createdAt || 0);
        const bTime = Date.parse(b?.updatedAt || b?.failedAt || b?.createdAt || 0);
        return bTime - aTime;
      })[0];

    return toTrimmedString(latestMatch?.status).toLowerCase();
  }

  function hasFinalizedPremiumPayment(record) {
    if (!isPremiumApplicationRecord(record)) {
      return true;
    }

    const relatedPaymentStatus = getRelatedPremiumPaymentStatus(record);
    if (relatedPaymentStatus === "success") return true;
    if (relatedPaymentStatus === "pending" || relatedPaymentStatus === "failed") return false;

    const paymentStatus = toTrimmedString(record?.paymentStatus).toLowerCase();
    if (paymentStatus === "successful" || paymentStatus === "success" || paymentStatus === "paid") {
      return true;
    }

    return Boolean(
      toTrimmedString(record?.paymentDate) ||
        toTrimmedString(record?.paymentReference) ||
        toTrimmedString(record?.referenceCode)
    );
  }

  function isFinalizedApplicationRecord(record) {
    const normalizedStatus = toTrimmedString(record?.status).toLowerCase();
    if (
      normalizedStatus === "pending_payment" ||
      normalizedStatus === "payment_pending" ||
      normalizedStatus === "awaiting_payment" ||
      normalizedStatus === "draft_payment_pending" ||
      normalizedStatus === "payment_failed" ||
      normalizedStatus === "failed_payment"
    ) {
      return false;
    }

    return hasFinalizedPremiumPayment(record);
  }

  function getPriorityRank(record) {
    const priority = normalizeApplicationPriority(record?.applicationPriority, record);
    const priorityMap = {
      enterprise: 4,
      professional: 3,
      premium: 2,
      normal: 1,
    };

    return priorityMap[priority] || 1;
  }

  function compareApplicationsByPriority(a, b) {
    const rankDifference = getPriorityRank(b) - getPriorityRank(a);
    if (rankDifference !== 0) return rankDifference;
    return new Date(b?.appliedAt || 0) - new Date(a?.appliedAt || 0);
  }

  function normalizeApplicationRecord(application) {
    const record = application && typeof application === "object" ? application : {};
    const appliedAt =
      toTrimmedString(record.appliedAt) ||
      toTrimmedString(record.updatedAt) ||
      new Date().toISOString();
    const applicationId = toTrimmedString(record.applicationId || record.id);
    const jobId = toTrimmedString(record.jobId || record.job_id || record.id);
    const location =
      toTrimmedString(record.location) ||
      [toTrimmedString(record.city), toTrimmedString(record.region)]
        .filter(Boolean)
        .join(", ");
    const skills = Array.isArray(record.skills)
      ? record.skills
          .map((skill) => toTrimmedString(skill))
          .filter(Boolean)
          .slice(0, 3)
      : toTrimmedString(record.skills || record.skillSet)
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
          .slice(0, 3);

    return {
      ...record,
      id: applicationId,
      applicationId: applicationId,
      jobId: jobId,
      jobTitle: sanitizeTextValue(record.jobTitle || record.title, 120),
      title: sanitizeTextValue(record.title || record.jobTitle, 120),
      description: sanitizeMultilineValue(record.description || record.jobDescription, 2500),
      company: sanitizeTextValue(
        record.company || record.companyName || record.businessName
      , 120),
      location: sanitizeTextValue(location, 120),
      candidateId: toTrimmedString(record.candidateId || record.candidate_id),
      status: normalizeStatusValue(record.status, record),
      accepted: record.accepted === true || toTrimmedString(record.status).toLowerCase() === "accepted",
      rejected:
        record.rejected === true ||
        toTrimmedString(record.status).toLowerCase() === "rejected" ||
        toTrimmedString(record.status).toLowerCase() === "withdrawn",
      dateApplied: normalizeDateApplied(record.dateApplied, appliedAt),
      appliedAt: appliedAt,
      applicationPriority: normalizeApplicationPriority(record.applicationPriority, record),
      highestEducationLevel: sanitizeTextValue(record.highestEducationLevel || record.educationLevel || record.highestEducation, 120),
      educationLevel: sanitizeTextValue(record.highestEducationLevel || record.educationLevel || record.highestEducation, 120),
      boostType: normalizeApplicationPriority(record.boostType, record),
      isPremium:
        Boolean(record.isPremium) ||
        toTrimmedString(record.tier).toLowerCase() === "premium" ||
        toTrimmedString(record.status).toLowerCase() === "premium_verified" ||
        toTrimmedString(record.status).toLowerCase() === "pending_payment",
      tier:
        toTrimmedString(record.tier) ||
        (Boolean(record.isPremium) ? "premium" : "standard"),
      updatedAt: toTrimmedString(record.updatedAt) || appliedAt,
      acceptedAt: toTrimmedString(record.acceptedAt),
      rejectedAt: toTrimmedString(record.rejectedAt),
      skills: skills.map(function (skill) {
        return sanitizeTextValue(skill, 60);
      }).filter(Boolean),
      employerCompanyName: sanitizeTextValue(record.employerCompanyName || record.companyName, 120),
      employerName: sanitizeTextValue(record.employerName, 120),
      employerPosition: sanitizeTextValue(record.employerPosition, 120),
      contactEmail: sanitizeTextValue(record.contactEmail, 120),
      contactPhone: sanitizeTextValue(record.contactPhone, 30),
      contactAddress: sanitizeTextValue(record.contactAddress, 180),
      applicationDocuments: normalizeApplicationDocuments(
        record.applicationDocuments || record.documents || record.attachments
      ),
      paymentStatus: toTrimmedString(record.paymentStatus),
      paymentDate: toTrimmedString(record.paymentDate),
      paymentReference: toTrimmedString(record.paymentReference || record.referenceCode),
      paymentActionId: toTrimmedString(record.paymentActionId),
      paymentServiceType: toTrimmedString(record.paymentServiceType),
    };
  }

  function loadRawApplications() {
    const parsed = safeJSONParse(localStorage.getItem(APPLICATIONS_KEY));
    return Array.isArray(parsed) ? parsed.map(normalizeApplicationRecord) : [];
  }

  function loadApplications() {
    const normalizedApplications = loadRawApplications();
    const finalizedApplications = normalizedApplications.filter(isFinalizedApplicationRecord);

    if (finalizedApplications.length !== normalizedApplications.length) {
      localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(finalizedApplications));
    }

    return finalizedApplications;
  }

  function saveApplications(applications) {
    const safeApplications = (Array.isArray(applications) ? applications : [])
      .map(normalizeApplicationRecord)
      .filter(isFinalizedApplicationRecord);

    localStorage.setItem(
      APPLICATIONS_KEY,
      JSON.stringify(safeApplications)
    );
  }

  function getCurrentCandidateIdentity() {
    if (window.JobAssistCandidateSession?.getCurrentCandidate) {
      const candidateProfile = window.JobAssistCandidateSession.getCurrentCandidate();
      return {
        id: toTrimmedString(window.JobAssistCandidateSession.getCandidateId(candidateProfile)),
        email: toTrimmedString(window.JobAssistCandidateSession.getCandidateEmail(candidateProfile)).toLowerCase(),
        profile: candidateProfile || {},
      };
    }

    const currentCandidate =
      safeJSONParse(localStorage.getItem("jobassist_current_user")) ||
      {};

    return {
      id: toTrimmedString(
        currentCandidate.id ||
          currentCandidate.candidateId ||
          currentCandidate.userId
      ),
      email: toTrimmedString(currentCandidate.email).toLowerCase(),
      profile: currentCandidate,
    };
  }

  function isCandidateMatch(application, candidate) {
    const candidateId = toTrimmedString(candidate?.id || candidate?.candidateId);
    const candidateEmail = toTrimmedString(candidate?.email).toLowerCase();
    const applicationCandidateId = toTrimmedString(application?.candidateId);
    const applicationEmail = toTrimmedString(application?.email).toLowerCase();

    if (candidateId && applicationCandidateId) {
      return candidateId === applicationCandidateId;
    }

    if (candidateEmail && applicationEmail) {
      return candidateEmail === applicationEmail;
    }

    return false;
  }

  function getApplicationsForCandidate(candidate) {
    const targetCandidate = candidate || getCurrentCandidateIdentity().profile;
    return loadApplications()
      .filter(function (application) {
        return isCandidateMatch(application, targetCandidate);
      })
      .sort(function (a, b) {
        return new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0);
      });
  }

  function getApplicationsForJob(jobId) {
    const jobKey = toTrimmedString(jobId);
    return loadApplications()
      .filter(function (application) {
        return toTrimmedString(application.jobId) === jobKey;
      })
      .sort(compareApplicationsByPriority);
  }

  function createApplication(applicationInput) {
    const applications = loadApplications();
    const input = applicationInput && typeof applicationInput === "object" ? applicationInput : {};
    const candidateId = toTrimmedString(input.candidateId);
    const jobId = toTrimmedString(input.jobId);

    if (!candidateId || !jobId) {
      throw new Error("Application requires both candidateId and jobId.");
    }

    const duplicate = applications.some(function (application) {
      return (
        toTrimmedString(application.candidateId) === candidateId &&
        toTrimmedString(application.jobId) === jobId
      );
    });

    if (duplicate) {
      throw new Error("You have already applied to this job");
    }

    if (!window.JobAssistIdGenerator) {
      throw new Error("Application ID generator unavailable.");
    }

    const existingIds = applications.map(function (application) {
      return application.applicationId || application.id;
    });

    const generatedId =
      toTrimmedString(input.applicationId || input.id) ||
      window.JobAssistIdGenerator.generateApplicationId(existingIds);
    const appliedAt = toTrimmedString(input.appliedAt) || new Date().toISOString();
    const record = normalizeApplicationRecord({
      ...input,
      id: generatedId,
      applicationId: generatedId,
      jobId: jobId,
      candidateId: candidateId,
      appliedAt: appliedAt,
      dateApplied: normalizeDateApplied(input.dateApplied, appliedAt),
      status: input.status || "in-review",
      accepted: input.accepted === true,
      rejected: input.rejected === true,
      updatedAt: appliedAt,
    });

    applications.unshift(record);
    saveApplications(applications);
    return record;
  }

  function updateApplication(applicationId, updates) {
    const key = toTrimmedString(applicationId);
    const applications = loadApplications();
    const index = applications.findIndex(function (application) {
      return toTrimmedString(application.applicationId || application.id) === key;
    });

    if (index === -1) {
      return null;
    }

    const nextRecord = normalizeApplicationRecord({
      ...applications[index],
      ...(updates && typeof updates === "object" ? updates : {}),
      id: applications[index].applicationId || applications[index].id,
      applicationId: applications[index].applicationId || applications[index].id,
      updatedAt: new Date().toISOString(),
    });

    applications[index] = nextRecord;
    saveApplications(applications);
    return nextRecord;
  }

  function setApplicationStatus(applicationId, status) {
    const normalizedStatus = normalizeStatusValue(status, { status: status });
    const timestamp = new Date().toISOString();
    const updates = {
      status: normalizedStatus,
      accepted: normalizedStatus === "accepted",
      rejected: normalizedStatus === "rejected",
    };

    if (normalizedStatus === "accepted") {
      updates.acceptedAt = timestamp;
      updates.rejectedAt = "";
    }

    if (normalizedStatus === "rejected") {
      updates.rejectedAt = timestamp;
      updates.acceptedAt = "";
    }

    return updateApplication(applicationId, updates);
  }

  function deleteApplication(applicationId) {
    const key = toTrimmedString(applicationId);
    const applications = loadApplications();
    const nextApplications = applications.filter(function (application) {
      return toTrimmedString(application.applicationId || application.id) !== key;
    });

    if (nextApplications.length === applications.length) {
      return false;
    }

    saveApplications(nextApplications);
    return true;
  }

  function findApplicationById(applicationId) {
    const key = toTrimmedString(applicationId);
    return (
      loadApplications().find(function (application) {
        return toTrimmedString(application.applicationId || application.id) === key;
      }) || null
    );
  }

  window.JobAssistApplications = {
    key: APPLICATIONS_KEY,
    normalizeApplicationRecord: normalizeApplicationRecord,
    normalizeApplicationDocuments: normalizeApplicationDocuments,
    normalizeStatusValue: normalizeStatusValue,
    normalizeApplicationPriority: normalizeApplicationPriority,
    isFinalizedApplicationRecord: isFinalizedApplicationRecord,
    compareApplicationsByPriority: compareApplicationsByPriority,
    loadRawApplications: loadRawApplications,
    loadApplications: loadApplications,
    saveApplications: saveApplications,
    getApplicationsForCandidate: getApplicationsForCandidate,
    getApplicationsForJob: getApplicationsForJob,
    createApplication: createApplication,
    updateApplication: updateApplication,
    setApplicationStatus: setApplicationStatus,
    deleteApplication: deleteApplication,
    findApplicationById: findApplicationById,
    getCurrentCandidateIdentity: getCurrentCandidateIdentity,
    isCandidateMatch: isCandidateMatch,
  };
})();
