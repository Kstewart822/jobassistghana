(function () {
  const APPLICATION_COUNTER_KEY = "jobassist_app_counter";
  const JOB_COUNTER_KEY = "jobassist_job_counter";
  const PAYMENT_REFERENCE_COUNTER_KEY = "jobassist_payment_ref_counter";
  const LEGACY_COUNTERS_KEY = "jobassist_id_counters";

  function safeJSONParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function normalizeId(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getNumericCounter(key) {
    const value = Number(localStorage.getItem(key) || 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function setNumericCounter(key, value) {
    localStorage.setItem(key, String(Math.max(0, Math.floor(Number(value) || 0))));
  }

  function getLegacyCounters() {
    const counters = safeJSONParse(localStorage.getItem(LEGACY_COUNTERS_KEY));
    return counters && typeof counters === "object" && !Array.isArray(counters)
      ? counters
      : {};
  }

  function saveLegacyCounters(counters) {
    localStorage.setItem(LEGACY_COUNTERS_KEY, JSON.stringify(counters));
  }

  function formatSequentialId(prefix, value, minDigits) {
    const paddedValue = String(Math.max(0, Number(value) || 0)).padStart(
      Math.max(1, Number(minDigits) || 4),
      "0"
    );
    return prefix + "-" + paddedValue;
  }

  function createSequentialGenerator(config) {
    const prefix = String(config.prefix || "").trim().toUpperCase();
    const storageKey = String(config.storageKey || "").trim();
    const minDigits = Math.max(1, Number(config.minDigits) || 4);

    return function generateSequentialId(existingIds) {
      const usedIds = new Set(
        Array.from(existingIds || [])
          .map(normalizeId)
          .filter(Boolean)
      );

      let nextValue = Math.max(1, getNumericCounter(storageKey) + 1);
      let candidateId = formatSequentialId(prefix, nextValue, minDigits);

      while (usedIds.has(normalizeId(candidateId))) {
        nextValue += 1;
        candidateId = formatSequentialId(prefix, nextValue, minDigits);
      }

      setNumericCounter(storageKey, nextValue);
      return candidateId;
    };
  }

  const generateApplicationId = createSequentialGenerator({
    prefix: "APP",
    storageKey: APPLICATION_COUNTER_KEY,
    minDigits: 4,
  });

  const generateJobId = createSequentialGenerator({
    prefix: "JOB",
    storageKey: JOB_COUNTER_KEY,
    minDigits: 4,
  });

  const generatePaymentReferenceCounter = createSequentialGenerator({
    prefix: "REF",
    storageKey: PAYMENT_REFERENCE_COUNTER_KEY,
    minDigits: 4,
  });

  function extractNumericSuffix(id, prefix) {
    const normalizedId = normalizeId(id);
    const normalizedPrefix = normalizeId(prefix);

    if (!normalizedPrefix || !normalizedId.startsWith(normalizedPrefix + "-")) {
      return null;
    }

    const numericPart = normalizedId.slice(normalizedPrefix.length + 1);
    return /^\d+$/.test(numericPart) ? Number(numericPart) : null;
  }

  function getHighestNumericSuffix(existingIds, prefix) {
    return Array.from(existingIds || []).reduce(function (highest, id) {
      const suffix = extractNumericSuffix(id, prefix);
      return suffix !== null && suffix > highest ? suffix : highest;
    }, 0);
  }

  function generateLegacyCounterId(prefix, existingIds, options) {
    const normalizedPrefix = normalizeId(prefix);
    const ids = new Set(
      Array.from(existingIds || [])
        .map(function (id) {
          return String(id || "").trim();
        })
        .filter(Boolean)
    );
    const minValue = Math.max(1, Number(options?.minValue || 1000));
    const counters = getLegacyCounters();
    const storedValue = Number(counters[normalizedPrefix] || 0);
    const highestExisting = getHighestNumericSuffix(ids, normalizedPrefix);
    let nextValue = Math.max(minValue, storedValue + 1, highestExisting + 1);
    let candidateId = normalizedPrefix + "-" + String(nextValue);

    while (ids.has(candidateId)) {
      nextValue += 1;
      candidateId = normalizedPrefix + "-" + String(nextValue);
    }

    counters[normalizedPrefix] = nextValue;
    saveLegacyCounters(counters);

    return candidateId;
  }

  function generateUniqueId(prefix, existingIds, options) {
    const normalizedPrefix = normalizeId(prefix);

    if (normalizedPrefix === "APP") {
      return generateApplicationId(existingIds);
    }

    if (normalizedPrefix === "JOB" || normalizedPrefix === "JA") {
      return generateJobId(existingIds);
    }

    return generateLegacyCounterId(normalizedPrefix, existingIds, options);
  }

  function normalizePaymentReferenceType(type) {
    return String(type || "").trim().toLowerCase() || "payment";
  }

  function generatePaymentReference(type, existingReferences) {
    const normalizedRefs = Array.from(existingReferences || [])
      .map(normalizeId)
      .filter(Boolean);
    normalizePaymentReferenceType(type);
    const highestExistingReference = normalizedRefs.reduce(function (highest, reference) {
      const match = String(reference).match(/(\d+)$/);
      const value = match ? Number(match[1]) : 0;
      return value > highest ? value : highest;
    }, 0);

    const storedCounter = getNumericCounter(PAYMENT_REFERENCE_COUNTER_KEY);
    if (highestExistingReference > storedCounter) {
      setNumericCounter(PAYMENT_REFERENCE_COUNTER_KEY, highestExistingReference);
    }

    const counterId = generatePaymentReferenceCounter();
    const numericSuffix = extractNumericSuffix(counterId, "REF") || 1;
    return `JAG-${String(numericSuffix).padStart(4, "0")}`;
  }

  function generateRef(existingReferences) {
    return generatePaymentReference("payment", existingReferences);
  }

  window.JobAssistIdGenerator = {
    generateApplicationId: generateApplicationId,
    generateJobId: generateJobId,
    generateUniqueId: generateUniqueId,
    generatePaymentReference: generatePaymentReference,
    generateRef: generateRef,
    normalizePaymentReferenceType: normalizePaymentReferenceType,
    extractNumericSuffix: extractNumericSuffix,
    getHighestNumericSuffix: getHighestNumericSuffix,
    formatSequentialId: formatSequentialId,
  };
})();
