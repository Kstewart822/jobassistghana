(function (window) {
  const ACTIONS_KEY = "jobassist_payment_actions";
  const CURRENT_KEY = "jobassist_current_payment_action";
  const BOOSTED_JOBS_KEY = "jobassist_boosted_jobs";
  const REFERENCE_PREFIX = "JAG-PAY";

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function toText(value) {
    return String(value == null ? "" : value).trim();
  }

  function sanitizeText(value, maxLength) {
    if (window.JobAssistInputHardening?.sanitizeText) {
      return window.JobAssistInputHardening.sanitizeText(value, { maxLength: maxLength || 0 });
    }
    return toText(value);
  }

  function toNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function getActions() {
    const parsed = safeParse(localStorage.getItem(ACTIONS_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveActions(actions) {
    localStorage.setItem(ACTIONS_KEY, JSON.stringify(Array.isArray(actions) ? actions : []));
  }

  function makeReference(input) {
    const parts = [
      REFERENCE_PREFIX,
      toText(input.role || input.flow || "user").slice(0, 3).toUpperCase() || "USR",
      toText(input.serviceType || input.serviceName || input.service || "service")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 18)
        .toUpperCase() || "SERVICE",
      Date.now().toString(36).toUpperCase(),
      Math.random().toString(36).slice(2, 8).toUpperCase(),
    ].filter(Boolean);

    return parts.join("-");
  }

  function formatReference(ref) {
    const normalizedRef = toText(ref);
    if (!normalizedRef) return "N/A";
    if (normalizedRef.length <= 12) return normalizedRef;

    const start = normalizedRef.slice(0, 3);
    const end = normalizedRef.slice(-6);
    return `${start}...${end}`;
  }

  function getBoostedJobs() {
    const parsed = safeJSONParse(localStorage.getItem(BOOSTED_JOBS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  }

  function getActiveBoostedJobs() {
    const now = Date.now();
    return getBoostedJobs().filter((entry) => {
      const jobId = toText(entry && entry.jobId);
      const expiresAt = Number(entry && entry.expiresAt);
      return Boolean(jobId) && Number.isFinite(expiresAt) && expiresAt > now;
    });
  }

  function getJobBoostRecord(jobId) {
    const normalizedJobId = toText(jobId);
    if (!normalizedJobId) return null;

    return (
      getActiveBoostedJobs().find((entry) => toText(entry && entry.jobId) === normalizedJobId) || null
    );
  }

  function makeActionId(action) {
    const parts = [
      toText(action.role || action.flow || "payment"),
      toText(action.serviceType || action.serviceName || "service"),
      toText(action.referenceCode || ""),
      toText(action.jobId || ""),
      toText(action.applicationId || ""),
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8),
    ].filter(Boolean);

    return parts.join("-");
  }

  function normalizeAction(input) {
    const now = new Date().toISOString();
    const amount = toNumber(input.amount, 0);
    const normalizedReference = toText(
      input.reference || input.referenceCode || input.referenceId || ""
    ) || makeReference(input);
    const normalizedServiceType = sanitizeText(input.serviceType || input.serviceName || input.service || "", 80);
    const normalizedServiceName = sanitizeText(input.serviceName || input.serviceType || input.service || "Payment", 120);
    const normalizedApplicationId = toText(input.applicationId || "");
    const normalizedApplicantId = toText(input.applicantId || normalizedApplicationId);
    return {
      ...input,
      actionId: toText(input.actionId) || makeActionId(input),
      role: toText(input.role || input.flow || ""),
      flow: toText(input.flow || input.role || ""),
      serviceType: normalizedServiceType,
      serviceName: normalizedServiceName,
      service: toText(input.service || normalizedServiceType || normalizedServiceName),
      referenceCode: normalizedReference,
      reference: normalizedReference,
      jobId: toText(input.jobId || ""),
      applicationId: normalizedApplicationId,
      applicantId: normalizedApplicantId,
      employerId: toText(input.employerId || ""),
      candidateId: toText(input.candidateId || ""),
      jobTitle: sanitizeText(input.jobTitle || (input.payload && input.payload.jobTitle) || "", 120),
      amount: amount,
      displayAmount: toText(input.displayAmount || (amount ? `GHS ${amount.toFixed(2)}` : "")),
      status: toText(input.status || "pending").toLowerCase(),
      createdAt: input.createdAt || now,
      updatedAt: now,
      payload: input.payload && typeof input.payload === "object" ? input.payload : {},
    };
  }

  function rememberCurrentActionId(actionId) {
    if (!actionId) return;
    sessionStorage.setItem(CURRENT_KEY, actionId);
    localStorage.setItem(CURRENT_KEY, actionId);
  }

  function clearCurrentActionId(actionId) {
    const currentSession = toText(sessionStorage.getItem(CURRENT_KEY));
    const currentLocal = toText(localStorage.getItem(CURRENT_KEY));
    if (!actionId || currentSession === actionId) {
      sessionStorage.removeItem(CURRENT_KEY);
    }
    if (!actionId || currentLocal === actionId) {
      localStorage.removeItem(CURRENT_KEY);
    }
  }

  function getCurrentActionId() {
    return toText(sessionStorage.getItem(CURRENT_KEY) || localStorage.getItem(CURRENT_KEY));
  }

  function findMatchingActionIndex(actions, criteria) {
    const actionId = toText(criteria.actionId);
    const referenceCode = toText(criteria.referenceCode || criteria.reference);
    const serviceType = toText(criteria.serviceType);
    const service = toText(criteria.service);
    const role = toText(criteria.role || criteria.flow);
    const jobId = toText(criteria.jobId);
    const applicationId = toText(criteria.applicationId);
    const applicantId = toText(criteria.applicantId || applicationId);
    const candidateId = toText(criteria.candidateId);
    const employerId = toText(criteria.employerId);
    const currentActionId = getCurrentActionId();

    if (actionId) {
      const idx = actions.findIndex((item) => toText(item.actionId) === actionId);
      if (idx >= 0) return idx;
    }

    if (referenceCode) {
      const idx = actions.findIndex((item) => toText(item.referenceCode) === referenceCode);
      if (idx >= 0) return idx;
    }

    if (currentActionId) {
      const idx = actions.findIndex((item) => toText(item.actionId) === currentActionId);
      if (idx >= 0) return idx;
    }

    return actions.findIndex((item) => {
      if (serviceType && toText(item.serviceType) !== serviceType) return false;
      if (service && toText(item.service) !== service) return false;
      if (role && toText(item.role || item.flow) !== role) return false;
      if (jobId && toText(item.jobId) !== jobId) return false;
      if (applicationId && toText(item.applicationId) !== applicationId) return false;
      if (applicantId && toText(item.applicantId) !== applicantId) return false;
      if (candidateId && toText(item.candidateId) !== candidateId) return false;
      if (employerId && toText(item.employerId) !== employerId) return false;
      if (toText(item.status).toLowerCase() === "failed") return false;
      return true;
    });
  }

  function registerPendingPaymentAction(input) {
    const actions = getActions();
    const normalized = normalizeAction({ ...input, status: "pending" });
    const idx = findMatchingActionIndex(actions, normalized);

    if (idx >= 0) {
      const existing = normalizeAction(actions[idx]);
      const merged = normalizeAction({
        ...existing,
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
        payload: {
          ...(existing.payload || {}),
          ...(normalized.payload || {}),
        },
      });
      actions[idx] = merged;
      saveActions(actions);
      rememberCurrentActionId(merged.actionId);
      return merged;
    }

    actions.unshift(normalized);
    saveActions(actions);
    rememberCurrentActionId(normalized.actionId);
    return normalized;
  }

  function getPaymentAction(criteria) {
    const actions = getActions();
    const idx = findMatchingActionIndex(actions, criteria || {});
    return idx >= 0 ? actions[idx] : null;
  }

  function updatePaymentAction(criteria, updates) {
    const actions = getActions();
    const idx = findMatchingActionIndex(actions, criteria || {});
    if (idx < 0) return null;

    const merged = normalizeAction({
      ...actions[idx],
      ...(updates || {}),
      actionId: actions[idx].actionId,
      createdAt: actions[idx].createdAt,
      payload: {
        ...(actions[idx].payload || {}),
        ...((updates && updates.payload) || {}),
      },
    });

    actions[idx] = merged;
    saveActions(actions);
    if (merged.status === "pending") rememberCurrentActionId(merged.actionId);
    return merged;
  }

  function finalizePendingPaymentAction(criteria, finalizer) {
    const actions = getActions();
    const idx = findMatchingActionIndex(actions, criteria || {});
    if (idx < 0) return { ok: false, reason: "not-found" };

    const action = actions[idx];
    if (toText(action.status).toLowerCase() === "success") {
      return { ok: true, alreadyFinalized: true, action };
    }

    if (toText(action.status).toLowerCase() !== "pending") {
      return { ok: false, reason: "not-pending", action };
    }

    if (typeof finalizer === "function") {
      const result = finalizer(action);
      if (result === false) {
        return { ok: false, reason: "finalizer-failed", action };
      }
    }

    const finalized = normalizeAction({
      ...action,
      status: "success",
      finalizedAt: new Date().toISOString(),
    });
    actions[idx] = finalized;
    saveActions(actions);
    clearCurrentActionId(finalized.actionId);
    return { ok: true, alreadyFinalized: false, action: finalized };
  }

  function failPendingPaymentAction(criteria, extra) {
    const actions = getActions();
    const idx = findMatchingActionIndex(actions, criteria || {});
    if (idx < 0) return null;

    const action = actions[idx];
    if (toText(action.status).toLowerCase() === "success") return action;

    const failed = normalizeAction({
      ...action,
      ...(extra || {}),
      status: "failed",
      failedAt: new Date().toISOString(),
    });
    actions[idx] = failed;
    saveActions(actions);
    clearCurrentActionId(failed.actionId);
    return failed;
  }

  async function verifyPaystackPayment(reference, criteria) {
    const normalizedReference = toText(reference || (criteria && criteria.referenceCode) || (criteria && criteria.reference));
    const hasActionId = toText(criteria && criteria.actionId);
    const action = getPaymentAction({
      ...(criteria || {}),
      reference: normalizedReference,
    });

    if (!action) {
      return { ok: false, reason: "not-found", action: null };
    }

    const normalizedStatus = toText(action.status).toLowerCase();
    if (normalizedStatus !== "pending" && normalizedStatus !== "success") {
      return { ok: false, reason: "not-pending", action };
    }

    if (!hasActionId && normalizedReference && toText(action.reference) !== normalizedReference) {
      return { ok: false, reason: "reference-mismatch", action };
    }

    // Backend-ready placeholder:
    // In production, replace this branch with a server call that verifies
    // the Paystack transaction reference via:
    //   GET /transaction/verify/:reference
    // The backend should use the secret key, confirm the charge status/amount,
    // and only then allow service activation.
    return { ok: true, verified: true, source: "frontend-placeholder", action };
  }

  function getPaymentHistory(role) {
    const normalizedRole = toText(role).toLowerCase();

    return getActions()
      .map((action) => normalizeAction(action))
      .filter((action) => {
        if (!normalizedRole) return true;
        return (
          toText(action.role).toLowerCase() === normalizedRole ||
          toText(action.flow).toLowerCase() === normalizedRole
        );
      })
      .sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || a.finalizedAt || a.failedAt || a.createdAt || 0);
        const bTime = Date.parse(b.updatedAt || b.finalizedAt || b.failedAt || b.createdAt || 0);
        return bTime - aTime;
      });
  }

  window.JobAssistPaymentGate = {
    ACTIONS_KEY,
    CURRENT_KEY,
    BOOSTED_JOBS_KEY,
    formatReference,
    getBoostedJobs,
    getActiveBoostedJobs,
    getJobBoostRecord,
    getPaymentHistory,
    getActions,
    getPaymentAction,
    getCurrentActionId,
    registerPendingPaymentAction,
    updatePaymentAction,
    finalizePendingPaymentAction,
    failPendingPaymentAction,
    verifyPaystackPayment,
  };
})(window);
