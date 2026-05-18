(function (window) {
  function toStringValue(value) {
    return String(value == null ? "" : value);
  }

  function normalizeWhitespace(value, preserveNewlines) {
    const text = toStringValue(value).replace(/\r\n?/g, "\n");
    if (preserveNewlines) {
      return text
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter((line, index, all) => line || (index > 0 && index < all.length - 1))
        .join("\n")
        .trim();
    }

    return text.replace(/\s+/g, " ").trim();
  }

  function stripDangerousContent(value, preserveNewlines) {
    let text = toStringValue(value);
    text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, preserveNewlines ? "\n" : " ");
    text = text.replace(/<\/style[\s\S]*?>/gi, preserveNewlines ? "\n" : " ");
    text = text.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, preserveNewlines ? "\n" : " ");
    text = text.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, preserveNewlines ? "\n" : " ");
    text = text.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, preserveNewlines ? "\n" : " ");
    text = text.replace(/<embed[\s\S]*?>/gi, preserveNewlines ? "\n" : " ");
    text = text.replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, "");
    text = text.replace(/\bon\w+\s*=\s*[^\s>]+/gi, "");
    text = text.replace(/javascript\s*:/gi, "");
    text = text.replace(/vbscript\s*:/gi, "");
    text = text.replace(/data\s*:\s*text\/html/gi, "");
    text = text.replace(/<\/?[^>]+>/g, preserveNewlines ? "\n" : " ");
    return normalizeWhitespace(text, preserveNewlines);
  }

  function clamp(value, maxLength) {
    if (!maxLength || maxLength < 1) return value;
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }

  function sanitizeText(value, options) {
    const opts = options || {};
    return clamp(stripDangerousContent(value, false), opts.maxLength || 0);
  }

  function sanitizeMultilineText(value, options) {
    const opts = options || {};
    return clamp(stripDangerousContent(value, true), opts.maxLength || 0);
  }

  function escapeHtml(value) {
    return toStringValue(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeEmail(value) {
    return sanitizeText(value, { maxLength: 120 }).toLowerCase();
  }

  function isValidEmail(value) {
    const email = sanitizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
  }

  function normalizeGhanaPhone(value) {
    let digits = toStringValue(value).replace(/\D/g, "");
    if (!digits) return "";

    if (digits.startsWith("233") && digits.length >= 12) {
      digits = "0" + digits.slice(3, 12);
    } else if (digits.length === 9) {
      digits = "0" + digits;
    } else if (digits.length > 10 && digits.startsWith("0")) {
      digits = digits.slice(0, 10);
    }

    return /^0\d{9}$/.test(digits) ? digits : "";
  }

  function isValidGhanaPhone(value) {
    return Boolean(normalizeGhanaPhone(value));
  }

  function sanitizeUrl(value) {
    const text = sanitizeText(value, { maxLength: 300 });
    if (!text) return "";

    if (/^(javascript|vbscript|data):/i.test(text)) {
      return "";
    }

    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
    try {
      const parsed = new URL(withProtocol);
      if (!/^https?:$/i.test(parsed.protocol)) return "";
      return parsed.toString();
    } catch {
      return "";
    }
  }

  function isValidDateInput(value) {
    const text = sanitizeText(value, { maxLength: 30 });
    if (!text) return false;
    const date = new Date(text);
    return !Number.isNaN(date.getTime());
  }

  function sanitizeStringArray(values, options) {
    return (Array.isArray(values) ? values : [])
      .map((value) => sanitizeText(value, options))
      .filter(Boolean);
  }

  const DISPLAY_ACRONYMS = new Set([
    "API",
    "CEO",
    "CSS",
    "CV",
    "GHS",
    "HR",
    "HTML",
    "IT",
    "JS",
    "NSS",
    "SHS",
    "SQL",
    "UI",
    "UX",
  ]);

  function isEmailLike(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());
  }

  function isUrlLike(value) {
    const text = String(value || "").trim();
    return /^(https?:\/\/|www\.)/i.test(text) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(text);
  }

  function isHandleLike(value) {
    return /^[@#][^\s]+$/.test(String(value || "").trim());
  }

  function getDisplayAcronymSet(extraAcronyms) {
    const combined = new Set(DISPLAY_ACRONYMS);
    (Array.isArray(extraAcronyms) ? extraAcronyms : []).forEach((value) => {
      const clean = String(value || "").trim().toUpperCase();
      if (clean) combined.add(clean);
    });
    return combined;
  }

  function formatDisplaySegment(segment, acronyms) {
    if (!segment || !/[A-Za-z]/.test(segment)) return segment;

    const upper = segment.toUpperCase();
    if (acronyms.has(upper)) {
      return upper;
    }

    const lower = segment.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function formatDisplayWord(word, acronyms) {
    const cleanWord = String(word || "");
    if (!cleanWord) return "";
    if (isEmailLike(cleanWord) || isUrlLike(cleanWord) || isHandleLike(cleanWord)) {
      return cleanWord;
    }

    const leading = cleanWord.match(/^[^A-Za-z0-9]+/)?.[0] || "";
    const trailing = cleanWord.match(/[^A-Za-z0-9]+$/)?.[0] || "";
    const core = cleanWord.slice(leading.length, cleanWord.length - trailing.length);

    if (!core || !/[A-Za-z]/.test(core)) {
      return cleanWord;
    }

    const formattedCore = core
      .split(/([\-\/])/)
      .map((part) => (/^[\-\/]$/.test(part) ? part : formatDisplaySegment(part, acronyms)))
      .join("")
      .replace(/(['\u2019])([A-Z])/g, function (_match, apostrophe, letter) {
        return apostrophe + letter.toLowerCase();
      });

    return `${leading}${formattedCore}${trailing}`;
  }

  function formatDisplayText(value, options) {
    const opts = options || {};
    const clean = normalizeWhitespace(value, false);
    if (!clean) return "";

    if (isEmailLike(clean)) return clean.toLowerCase();
    if (isUrlLike(clean) || isHandleLike(clean)) return clean;

    const acronyms = getDisplayAcronymSet(opts.acronyms);
    const formatted = clean
      .split(/\s+/)
      .map((word) => formatDisplayWord(word, acronyms))
      .join(" ");

    return clamp(formatted, opts.maxLength || 0);
  }

  function formatSkillDisplay(value, options) {
    const opts = options || {};
    return formatDisplayText(value, {
      ...opts,
      acronyms: Array.from(getDisplayAcronymSet(opts.acronyms)),
    });
  }

  function formatDisplayTextArray(values, options) {
    const opts = options || {};
    return (Array.isArray(values) ? values : [])
      .map((value) =>
        opts.skills ? formatSkillDisplay(value, opts) : formatDisplayText(value, opts),
      )
      .filter(Boolean);
  }

  window.JobAssistInputHardening = {
    sanitizeText,
    sanitizeMultilineText,
    sanitizeEmail,
    isValidEmail,
    normalizeGhanaPhone,
    isValidGhanaPhone,
    sanitizeUrl,
    isValidDateInput,
    sanitizeStringArray,
    formatDisplayText,
    formatSkillDisplay,
    formatDisplayTextArray,
    escapeHtml,
  };
})(window);
