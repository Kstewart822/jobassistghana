(function () {
  const STANDARD_DAYS = 30;
  const PREMIUM_MONTHS = 3;

  function normalizePackageType(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (
      normalized === "premium" ||
      normalized === "job_posting_premium" ||
      normalized === "premium job posting" ||
      normalized === "premium-posting"
    ) {
      return "premium";
    }

    if (
      normalized === "standard" ||
      normalized === "job_posting_standard" ||
      normalized === "standard job posting" ||
      normalized === "standard-posting"
    ) {
      return "standard";
    }

    return "standard";
  }

  function getPackageConfig(value) {
    const packageType = normalizePackageType(value);

    if (packageType === "premium") {
      return {
        packageType: "premium",
        amount: 500,
        durationLabel: "3 months",
        durationDescription: "active for 3 months",
        helperText:
          "Deadline is automatically set based on your selected posting package.",
      };
    }

    return {
      packageType: "standard",
      amount: 300,
      durationLabel: "30 days",
      durationDescription: "active for 30 days",
      helperText:
        "Deadline is automatically set based on your selected posting package.",
    };
  }

  function createSafeDate(input) {
    const parsed = input ? new Date(input) : new Date();
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }

  function parseDateValue(input) {
    if (!input) {
      return null;
    }

    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function addDays(dateInput, days) {
    const date = createSafeDate(dateInput);
    date.setDate(date.getDate() + days);
    return date;
  }

  function addMonths(dateInput, months) {
    const date = createSafeDate(dateInput);
    date.setMonth(date.getMonth() + months);
    return date;
  }

  function toInputDateValue(dateInput) {
    const date = parseDateValue(dateInput) || createSafeDate(dateInput);
    return date.toISOString().split("T")[0];
  }

  function formatDisplayDate(dateInput) {
    const date = parseDateValue(dateInput);
    if (!date) {
      return "Not specified";
    }

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function calculatePostingDates(packageTypeInput, baseDateInput) {
    const packageConfig = getPackageConfig(packageTypeInput);
    const activationDate = createSafeDate(baseDateInput);
    const expiryDate =
      packageConfig.packageType === "premium"
        ? addMonths(activationDate, PREMIUM_MONTHS)
        : addDays(activationDate, STANDARD_DAYS);

    return {
      packageType: packageConfig.packageType,
      postedAt: activationDate.toISOString(),
      expiresAt: expiryDate.toISOString(),
      applicationDeadline: expiryDate.toISOString(),
      deadline: toInputDateValue(expiryDate),
      deadlineDisplay: formatDisplayDate(expiryDate),
      postedDisplay: formatDisplayDate(activationDate),
      durationLabel: packageConfig.durationLabel,
      durationDescription: packageConfig.durationDescription,
      helperText: packageConfig.helperText,
      amount: packageConfig.amount,
    };
  }

  function getExpiryValue(job) {
    if (!job || typeof job !== "object") {
      return "";
    }

    return String(
      job.expiresAt ||
        job.applicationDeadline ||
        job.deadline ||
        ""
    ).trim();
  }

  function isJobClosed(job) {
    return Boolean(job?.isClosed) || String(job?.status || "").trim().toLowerCase() === "closed";
  }

  function isJobExpired(job, now = Date.now()) {
    const expiryValue = getExpiryValue(job);
    if (!expiryValue) {
      return false;
    }

    const expiryTime = new Date(expiryValue).getTime();
    if (Number.isNaN(expiryTime)) {
      return false;
    }

    return expiryTime < now;
  }

  function getDaysUntilExpiry(job, nowInput) {
    const expiryValue = getExpiryValue(job);
    if (!expiryValue) {
      return null;
    }

    const expiryDate = new Date(expiryValue);
    if (Number.isNaN(expiryDate.getTime())) {
      return null;
    }

    const today = createSafeDate(nowInput);
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  }

  function getJobLifecycle(job, now = Date.now()) {
    const closed = isJobClosed(job);
    const expired = isJobExpired(job, now);
    const daysLeft = getDaysUntilExpiry(job, now);

    if (closed) {
      return {
        isClosed: true,
        isExpired: false,
        isActive: false,
        isVisibleToCandidates: false,
        daysLeft,
        statusText: "Closed",
        statusClass: "status-closed",
        expiryValue: getExpiryValue(job),
      };
    }

    if (expired) {
      return {
        isClosed: false,
        isExpired: true,
        isActive: false,
        isVisibleToCandidates: false,
        daysLeft,
        statusText: "Expired",
        statusClass: "status-expired",
        expiryValue: getExpiryValue(job),
      };
    }

    return {
      isClosed: false,
      isExpired: false,
      isActive: true,
      isVisibleToCandidates: true,
      daysLeft,
      statusText: "Active",
      statusClass: "status-active",
      expiryValue: getExpiryValue(job),
    };
  }

  const api = {
    STANDARD_DAYS,
    PREMIUM_MONTHS,
    normalizePackageType,
    getPackageConfig,
    calculatePostingDates,
    getExpiryValue,
    isJobClosed,
    isJobExpired,
    getDaysUntilExpiry,
    getJobLifecycle,
    formatDisplayDate,
    toInputDateValue,
  };

  window.JobAssistJobPostingExpiry = api;
  window.JobPostingExpiry = api;
})();
