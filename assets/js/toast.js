(function () {
  var STYLE_ID = "jobassist-toast-styles";
  var CONTAINER_ID = "toastContainer";
  var CONTAINER_CLASS = "jag-toast-stack";
  var TOAST_CLASS = "jag-toast";
  var HIDE_DELAY = 3000;
  var activeToast = null;
  var hideTimer = null;
  var cleanupTimer = null;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "." + CONTAINER_CLASS + "{position:fixed;top:18px;right:18px;display:flex;flex-direction:column;gap:10px;z-index:12000;pointer-events:none;max-width:min(92vw,380px);}",
      "." + TOAST_CLASS + "{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.2);box-shadow:0 14px 32px rgba(9,24,54,0.18);color:#fff;font:600 13px/1.45 Arial,sans-serif;opacity:0;transform:translateY(-10px);transition:opacity .22s ease,transform .22s ease;pointer-events:auto;cursor:pointer;backdrop-filter:blur(6px);}",
      "." + TOAST_CLASS + ".is-visible{opacity:1;transform:translateY(0);}",
      "." + TOAST_CLASS + "__icon{width:18px;flex:0 0 18px;font-size:14px;line-height:1.35;text-align:center;margin-top:1px;}",
      "." + TOAST_CLASS + "__message{flex:1 1 auto;word-break:break-word;}",
      "." + TOAST_CLASS + "__close{border:none;background:transparent;color:inherit;font-size:16px;line-height:1;cursor:pointer;padding:0;opacity:.8;flex:0 0 auto;}",
      "." + TOAST_CLASS + "__close:hover{opacity:1;}",
      "." + TOAST_CLASS + "--success{background:linear-gradient(135deg,#138a4b,#0f6f3f);}",
      "." + TOAST_CLASS + "--error{background:linear-gradient(135deg,#b42318,#8f1f17);}",
      "." + TOAST_CLASS + "--warning{background:linear-gradient(135deg,#c28a14,#9f7010);color:#fff;}",
      "." + TOAST_CLASS + "--info{background:linear-gradient(135deg,#0a2a66,#143f8f);}",
      "@media (max-width: 768px){." + CONTAINER_CLASS + "{left:12px;right:12px;top:12px;align-items:center;max-width:none;}." + TOAST_CLASS + "{width:min(100%,420px);}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureContainer() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = CONTAINER_ID;
      document.body.appendChild(container);
    }
    container.className = CONTAINER_CLASS;
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    return container;
  }

  function getToastIcon(type) {
    switch (type) {
      case "success":
        return "OK";
      case "error":
        return "x";
      case "warning":
        return "!";
      default:
        return "i";
    }
  }

  function dismissToast(toast) {
    if (!toast || toast.dataset.dismissing === "true") return;
    toast.dataset.dismissing = "true";
    toast.classList.remove("is-visible");
    window.clearTimeout(cleanupTimer);
    cleanupTimer = window.setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      if (activeToast === toast) {
        activeToast = null;
      }
    }, 220);
  }

  function retriggerToastFeedback(toast) {
    if (!toast || typeof toast.animate !== "function") return;
    try {
      toast.animate(
        [
          { transform: "translateY(0) scale(1)", filter: "brightness(1)" },
          { transform: "translateY(0) scale(1.03)", filter: "brightness(1.07)" },
          { transform: "translateY(0) scale(1)", filter: "brightness(1)" }
        ],
        {
          duration: 220,
          easing: "ease"
        }
      );
    } catch (error) {
      console.warn("Toast refresh animation unavailable:", error);
    }
  }

  function showToast(message, type) {
    var normalizedMessage = normalizeText(message);
    if (!normalizedMessage) return;

    ensureStyles();
    var container = ensureContainer();
    var tone = ["success", "error", "warning", "info"].indexOf(type) >= 0 ? type : "info";

    Array.prototype.slice.call(container.querySelectorAll("." + TOAST_CLASS)).forEach(function (item) {
      if (item !== activeToast && item.parentNode) {
        item.parentNode.removeChild(item);
      }
    });

    if (!activeToast || !container.contains(activeToast)) {
      activeToast = document.createElement("div");
      activeToast.setAttribute("role", "status");

      var icon = document.createElement("span");
      icon.className = TOAST_CLASS + "__icon";

      var text = document.createElement("span");
      text.className = TOAST_CLASS + "__message";

      var close = document.createElement("button");
      close.type = "button";
      close.className = TOAST_CLASS + "__close";
      close.setAttribute("aria-label", "Dismiss notification");
      close.textContent = "x";
      close.addEventListener("click", function (event) {
        event.stopPropagation();
        dismissToast(activeToast);
      });

      activeToast.appendChild(icon);
      activeToast.appendChild(text);
      activeToast.appendChild(close);
      activeToast.addEventListener("click", function () {
        dismissToast(activeToast);
      });

      container.appendChild(activeToast);
    }

    activeToast.dataset.dismissing = "false";
    activeToast.className = TOAST_CLASS + " " + TOAST_CLASS + "--" + tone;
    activeToast.dataset.toastMessage = normalizedMessage;
    activeToast.dataset.toastType = tone;
    activeToast.querySelector("." + TOAST_CLASS + "__icon").textContent = getToastIcon(tone);
    activeToast.querySelector("." + TOAST_CLASS + "__message").textContent = normalizedMessage;

    window.clearTimeout(hideTimer);
    window.clearTimeout(cleanupTimer);
    activeToast.classList.remove("is-visible");

    window.requestAnimationFrame(function () {
      if (!activeToast) return;
      activeToast.classList.add("is-visible");
      retriggerToastFeedback(activeToast);
    });

    hideTimer = window.setTimeout(function () {
      dismissToast(activeToast);
    }, HIDE_DELAY);
  }

  function installToastApi() {
    window.JobAssistToast = window.JobAssistToast || {};
    window.JobAssistToast.showToast = showToast;
    window.jobAssistShowToast = showToast;
    window.showToast = showToast;
    window.toast = showToast;
    window.showSuccessToast = function (message) {
      showToast(message, "success");
    };
    window.showErrorToast = function (message) {
      showToast(message, "error");
    };
    window.showWarningToast = function (message) {
      showToast(message, "warning");
    };
    window.showInfoToast = function (message) {
      showToast(message, "info");
    };
    window.JobAssistUI = window.JobAssistUI || {};
    window.JobAssistUI.showToast = showToast;
    window.JobAssistUI.showSuccessToast = window.showSuccessToast;
    window.JobAssistUI.showErrorToast = window.showErrorToast;
    window.JobAssistUI.showWarningToast = window.showWarningToast;
    window.JobAssistUI.showInfoToast = window.showInfoToast;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ensureStyles();
      ensureContainer();
      installToastApi();
    }, { once: true });
  } else {
    ensureStyles();
    ensureContainer();
    installToastApi();
  }
})();
