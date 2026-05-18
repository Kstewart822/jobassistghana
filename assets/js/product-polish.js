(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getButtonLabel(button) {
    return normalizeText(button.textContent);
  }

  function setButtonLoading(button, loadingText) {
    if (!button || button.dataset.loadingApplied === "true") return;
    button.dataset.loadingApplied = "true";
    button.dataset.originalHtml = button.innerHTML;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    button.disabled = true;

    const icon = button.querySelector("i");
    if (icon) {
      button.innerHTML = icon.outerHTML + " " + loadingText;
    } else {
      button.textContent = loadingText;
    }

    window.setTimeout(function () {
      if (!document.body.contains(button)) return;
      button.innerHTML = button.dataset.originalHtml || button.innerHTML;
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      button.disabled = false;
      delete button.dataset.loadingApplied;
    }, 4000);
  }

  function inferLoadingText(button) {
    var id = (button.id || "").toLowerCase();
    var text = getButtonLabel(button).toLowerCase();

    if (/createaccount|signup|verify/.test(id) || /create account/.test(text)) {
      return "Creating Account";
    }
    if (/apply/.test(id) || /^apply(?: for this job)?$/.test(text)) {
      return "Applying";
    }
    if (/boost/.test(id) || /^boost(?: application| job)?$/.test(text)) {
      return "Applying Boost";
    }
    if (/pay/.test(id) || /complete payment|pay now|^pay /.test(text)) {
      return "Processing Payment";
    }
    if (/postjob|post-job/.test(id) || /post job/.test(text)) {
      return "Publishing Job";
    }
    if (/unlock/.test(id) || /unlock selected/.test(text)) {
      return "Unlocking Applicants";
    }
    if (/save/.test(id) || /save changes/.test(text)) {
      return "Saving Changes";
    }

    return "";
  }

  function enhanceButtonLabels() {
    var path = window.location.pathname.toLowerCase();
    document.querySelectorAll("button, a.btn").forEach(function (button) {
      if (button.querySelector("span#payAmount")) return;
      var label = getButtonLabel(button);
      if (!label) return;

      var nextLabel = "";
      if (path.indexOf("/candidate/") !== -1) {
        if (/^apply$/i.test(label)) nextLabel = "Apply for this Job";
        if (/^boost$/i.test(label)) nextLabel = "Boost Application";
        if (/^pay now$/i.test(label)) nextLabel = "Complete Payment";
      }
      if (path.indexOf("/employer/") !== -1) {
        if (/^pay now$/i.test(label)) nextLabel = "Complete Payment";
      }

      if (!nextLabel || nextLabel === label) return;
      var icon = button.querySelector("i");
      button.innerHTML = icon ? icon.outerHTML + " " + nextLabel : nextLabel;
    });
  }

  function enhanceEmptyStates() {
    var path = window.location.pathname.toLowerCase();
    document.querySelectorAll(".empty-state").forEach(function (state) {
      if (state.dataset.emptyEnhanced === "true") return;
      var heading = state.querySelector("h3");
      var body = state.querySelector("p");
      if (!heading && !body) return;

      var text = normalizeText((heading ? heading.textContent : "") + " " + (body ? body.textContent : "")).toLowerCase();
      var message = "";
      var actionHref = "";
      var actionLabel = "";

      if (text.indexOf("no applications") !== -1) {
        message = "Start applying to jobs to track your progress, updates, and next steps here.";
        actionHref = path.indexOf("/candidate/") !== -1 ? "browse-jobs.html" : "";
        actionLabel = "Browse Jobs";
      } else if (text.indexOf("no job") !== -1 && text.indexOf("post") !== -1) {
        message = "Publish your first role to start attracting candidates and managing applicants from this page.";
        actionHref = path.indexOf("/employer/") !== -1 ? "job-type.html" : "";
        actionLabel = "Post a Job";
      } else if (text.indexOf("no applicant") !== -1) {
        message = "Once candidates apply, you'll be able to review, filter, and manage them from this page.";
        actionHref = path.indexOf("/employer/") !== -1 ? "my-job-post.html" : "";
        actionLabel = "View Job Posts";
      } else if (text.indexOf("no accepted offers") !== -1 || text.indexOf("accepted offers") !== -1) {
        message = "Accepted offers will appear here once an employer moves your application forward.";
        actionHref = path.indexOf("/candidate/") !== -1 ? "your-applications.html" : "";
        actionLabel = "View Applications";
      }

      if (!message) return;

      if (body) {
        body.textContent = message;
      } else if (heading) {
        var p = document.createElement("p");
        p.textContent = message;
        state.appendChild(p);
        body = p;
      }

      if (
        actionHref &&
        !state.querySelector(".ja-empty-action") &&
        !state.querySelector(".btn, [class*='btn-'], .empty-actions a, .empty-actions button")
      ) {
        var action = document.createElement("a");
        action.href = actionHref;
        action.className = "btn btn-primary ja-empty-action";
        action.textContent = actionLabel;
        state.appendChild(action);
      }

      state.dataset.emptyEnhanced = "true";
    });
  }

  function installToastSystem() {
    if (window.JobAssistToast && typeof window.JobAssistToast.showToast === "function") {
      var sharedShowToast = window.JobAssistToast.showToast;
      window.jobAssistShowToast = sharedShowToast;
      window.showSuccessToast = function (message) {
        sharedShowToast(message, "success");
      };
      window.showErrorToast = function (message) {
        sharedShowToast(message, "error");
      };
      window.showInfoToast = function (message) {
        sharedShowToast(message, "info");
      };
      window.JobAssistUI = window.JobAssistUI || {};
      window.JobAssistUI.showToast = sharedShowToast;
      window.JobAssistUI.showSuccessToast = window.showSuccessToast;
      window.JobAssistUI.showErrorToast = window.showErrorToast;
      window.JobAssistUI.showInfoToast = window.showInfoToast;

      if (!window.__jobAssistAlertPatched) {
        window.__jobAssistAlertPatched = true;
        var sharedNativeAlert = window.alert.bind(window);
        window.alert = function (message) {
          try {
            var text = normalizeText(message);
            var lowered = text.toLowerCase();
            var type =
              /fail|error|invalid|unable|cannot|could not/.test(lowered)
                ? "error"
                : /success|completed|saved|activated|done/.test(lowered)
                  ? "success"
                  : /warning|careful|attention/.test(lowered)
                    ? "warning"
                    : "info";

            sharedShowToast(text, type);
            return;
          } catch (error) {
            console.warn("Toast alert fallback:", error);
          }
          sharedNativeAlert(message);
        };
      }
      return;
    }

    var stack = document.querySelector(".ja-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "ja-toast-stack";
      document.body.appendChild(stack);
    }

    var activeToast = null;
    var activeToastTimer = null;
    var activeToastCleanupTimer = null;

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

    function dismissActiveToast() {
      if (!activeToast) return;
      activeToast.classList.remove("is-visible");
      window.clearTimeout(activeToastCleanupTimer);
      activeToastCleanupTimer = window.setTimeout(function () {
        if (activeToast && activeToast.parentNode) {
          activeToast.parentNode.removeChild(activeToast);
        }
        activeToast = null;
      }, 220);
    }

    function showToast(message, type) {
      var normalizedMessage = normalizeText(message);
      if (!normalizedMessage) return;

      var tone = String(type || "info");

      Array.prototype.slice.call(stack.querySelectorAll(".ja-toast")).forEach(function (toast) {
        if (toast !== activeToast) {
          toast.remove();
        }
      });

      if (!activeToast || !stack.contains(activeToast)) {
        activeToast = document.createElement("div");
        activeToast.className = "ja-toast";
        stack.appendChild(activeToast);
      }

      activeToast.className = "ja-toast ja-toast--" + tone;
      activeToast.dataset.toastMessage = normalizedMessage;
      activeToast.dataset.toastType = tone;
      activeToast.textContent = normalizedMessage;

      window.clearTimeout(activeToastTimer);
      window.clearTimeout(activeToastCleanupTimer);
      activeToast.classList.remove("is-visible");

      requestAnimationFrame(function () {
        if (!activeToast) return;
        activeToast.classList.add("is-visible");
        retriggerToastFeedback(activeToast);
      });

      activeToastTimer = window.setTimeout(function () {
        dismissActiveToast();
      }, 4200);
    }

    window.jobAssistShowToast = showToast;
    window.showSuccessToast = function (message) {
      showToast(message, "success");
    };
    window.showErrorToast = function (message) {
      showToast(message, "error");
    };
    window.showInfoToast = function (message) {
      showToast(message, "info");
    };
    window.JobAssistUI = window.JobAssistUI || {};
    window.JobAssistUI.showToast = showToast;
    window.JobAssistUI.showSuccessToast = window.showSuccessToast;
    window.JobAssistUI.showErrorToast = window.showErrorToast;
    window.JobAssistUI.showInfoToast = window.showInfoToast;

    if (!window.__jobAssistAlertPatched) {
      window.__jobAssistAlertPatched = true;
      var nativeAlert = window.alert.bind(window);
      window.alert = function (message) {
        try {
          var text = normalizeText(message);
          var lowered = text.toLowerCase();
          var type =
            /fail|error|invalid|unable|cannot|could not/.test(lowered)
              ? "error"
              : /success|completed|saved|activated|done/.test(lowered)
                ? "success"
                : /warning|careful|attention/.test(lowered)
                  ? "warning"
                  : "info";

          if (window.jobAssistShowToast) {
            window.jobAssistShowToast(text, type);
            return;
          }
        } catch (error) {
          console.warn("Toast alert fallback:", error);
        }
        nativeAlert(message);
      };
    }
  }

  function installLoadingFeedback() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button || button.disabled) return;

      var label = getButtonLabel(button).toLowerCase();
      if (/cancel|close|back|logout|reset/.test(label)) return;

      var loadingText = inferLoadingText(button);
      if (!loadingText) return;

      setButtonLoading(button, loadingText);
    });
  }

  function getDefaultLogoutHref() {
    return window.location.pathname.indexOf("/employer/") !== -1 ||
      window.location.pathname.indexOf("\\employer\\") !== -1
      ? "../employer-login.html"
      : "../login.html";
  }

  function ensureLogoutModal() {
    var logoutModals = document.querySelectorAll("#logoutModal");
    var logoutModal = logoutModals[0] || null;
    var created = false;

    if (logoutModals.length > 1) {
      Array.prototype.slice.call(logoutModals, 1).forEach(function (extraModal) {
        extraModal.parentNode && extraModal.parentNode.removeChild(extraModal);
      });
    }

    if (!logoutModal) {
      logoutModal = document.createElement("div");
      logoutModal.id = "logoutModal";
      document.body.appendChild(logoutModal);
      created = true;
    }

    logoutModal.className = "logout-modal modal";
    logoutModal.setAttribute("aria-hidden", "true");

    var overlay = logoutModal.querySelector(".logout-modal__overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "logout-modal__overlay logout-overlay";
      overlay.setAttribute("data-close-logout", "");
      logoutModal.insertBefore(overlay, logoutModal.firstChild || null);
    }
    overlay.className = "logout-modal__overlay logout-overlay";

    var modalContent = logoutModal.querySelector(".modal-content, .logout-modal__dialog");
    if (!modalContent) {
      modalContent = document.createElement("div");
      modalContent.className = "modal-content";
      logoutModal.appendChild(modalContent);
    }

    modalContent.classList.add("logout-modal__dialog");
    modalContent.removeAttribute("style");
    modalContent.setAttribute("role", "dialog");
    modalContent.setAttribute("aria-modal", "true");
    modalContent.setAttribute("aria-labelledby", "logoutModalTitle");

    var header = modalContent.querySelector(".modal-header");
    if (!header) {
      header = document.createElement("div");
      header.className = "modal-header";
      modalContent.insertBefore(header, modalContent.firstChild || null);
    }
    header.removeAttribute("style");

    var title = header.querySelector(".modal-title, #logoutModalTitle");
    if (!title) {
      title = document.createElement("h3");
      title.className = "modal-title";
      header.insertBefore(title, header.firstChild || null);
    }
    title.id = "logoutModalTitle";
    title.classList.add("modal-title");
    title.textContent = "Confirm Logout";

    var closeButton = header.querySelector(".close-modal, .logout-modal__close");
    if (!closeButton) {
      closeButton = document.createElement("button");
      header.appendChild(closeButton);
    }
    closeButton.type = "button";
    closeButton.className = "close-modal logout-modal__close";
    closeButton.setAttribute("data-close-logout", "");
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "\u00D7";

    var body = modalContent.querySelector(".modal-body");
    if (!body) {
      body = document.createElement("div");
      body.className = "modal-body";
      modalContent.appendChild(body);
    }
    body.removeAttribute("style");
    body.innerHTML = "<p>Are you sure you want to log out of your account?</p>";

    var footer = modalContent.querySelector(".modal-footer, .logout-modal__actions");
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "modal-footer";
      modalContent.appendChild(footer);
    }
    footer.className = "modal-footer logout-modal__actions";
    footer.removeAttribute("style");

    var confirmButton = modalContent.querySelector("#confirmLogout, [data-confirm-logout]");
    if (!confirmButton) {
      confirmButton = document.createElement("button");
      confirmButton.id = "confirmLogout";
    }
    confirmButton.type = "button";
    confirmButton.id = "confirmLogout";
    confirmButton.className = "btn btn-danger";
    confirmButton.setAttribute("data-confirm-logout", "");
    confirmButton.textContent = "Log Out";

    var cancelButton = modalContent.querySelector("#cancelLogout, [data-close-logout].btn");
    if (!cancelButton || cancelButton === closeButton) {
      cancelButton = document.createElement("button");
      cancelButton.id = "cancelLogout";
    }
    cancelButton.type = "button";
    cancelButton.id = "cancelLogout";
    cancelButton.className = "btn btn-outline";
    cancelButton.setAttribute("data-close-logout", "");
    cancelButton.textContent = "Cancel";

    footer.innerHTML = "";
    footer.appendChild(cancelButton);
    footer.appendChild(confirmButton);

    return {
      modal: logoutModal,
      overlay: overlay,
      dialog: modalContent,
      confirmButton: confirmButton,
      cancelButton: cancelButton,
      closeButton: closeButton,
      created: created,
    };
  }

  function normalizeLogoutTriggers() {
    var selector = "#sidebarLogout, #dropdownLogout, [data-open-logout]";
    document.querySelectorAll(selector).forEach(function (trigger) {
      trigger.setAttribute("data-open-logout", "");
      if (!trigger.getAttribute("href")) {
        trigger.setAttribute("href", "#");
      }
    });
  }

  function normalizeLogoutModal() {
    var logoutComponent = ensureLogoutModal();
    var logoutModal = logoutComponent.modal;
    var confirmButton = logoutComponent.confirmButton;
    var lastFocusedElement = null;

    normalizeLogoutTriggers();

    function openLogoutModal() {
      lastFocusedElement = document.activeElement;
      document.querySelectorAll(".dropdown-menu.show").forEach(function (menu) {
        menu.classList.remove("show");
      });
      document.body.classList.add("ja-logout-open");
      logoutModal.classList.add("show");
      logoutModal.setAttribute("aria-hidden", "false");
      window.setTimeout(function () {
        logoutComponent.cancelButton.focus();
      }, 0);
    }

    function hideLogoutModal() {
      document.body.classList.remove("ja-logout-open");
      logoutModal.classList.remove("show");
      logoutModal.setAttribute("aria-hidden", "true");
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }

    window.openLogoutModal = openLogoutModal;
    window.showLogoutModal = openLogoutModal;
    window.closeLogoutModal = hideLogoutModal;
    window.hideLogoutModal = hideLogoutModal;

    if (logoutComponent.created && logoutModal.dataset.jaFallbackLogoutBound !== "true") {
      logoutModal.dataset.jaFallbackLogoutBound = "true";
      confirmButton.addEventListener("click", function () {
        hideLogoutModal();
        window.location.href = getDefaultLogoutHref();
      });
    }

    if (logoutModal.dataset.jaLogoutHandlersBound === "true") return;
    logoutModal.dataset.jaLogoutHandlersBound = "true";

    document.addEventListener(
      "click",
      function (event) {
        var trigger = event.target.closest("#sidebarLogout, #dropdownLogout, [data-open-logout]");
        if (!trigger) return;

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }

        openLogoutModal();
      },
      true
    );

    logoutModal.querySelectorAll("[data-close-logout]").forEach(function (closeControl) {
      closeControl.addEventListener("click", hideLogoutModal);
    });

    logoutModal.addEventListener("click", function (event) {
      if (event.target === logoutModal || event.target === logoutComponent.overlay) {
        hideLogoutModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && logoutModal.classList.contains("show")) {
        hideLogoutModal();
      }
    });
  }

  function resetSidebarScroll() {
    var sidebarNodes = document.querySelectorAll(
      ".sidebar, .sidebar-menu, .sidebar-content, .sidebar-inner"
    );

    if (!sidebarNodes.length) return;

    sidebarNodes.forEach(function (node) {
      if (typeof node.scrollTop === "number") {
        node.scrollTop = 0;
      }
    });
  }

  function resetPageScroll() {
    window.scrollTo(0, 0);

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }

    if (document.body) {
      document.body.scrollTop = 0;
    }
  }

  function isSidebarPage() {
    return !!document.querySelector(".sidebar");
  }

  function normalizeSidebarStructure(sidebar, mainContent, overlay, menuButton, sidebarToggle) {
    if (!sidebar || sidebar.dataset.jaSidebarNormalized === "true") return;

    sidebar.dataset.jaSidebarNormalized = "true";
    sidebar.classList.add("ja-sidebar-shell");

    if (mainContent) {
      mainContent.classList.add("ja-main-shell");
    }

    if (overlay) {
      overlay.classList.add("ja-sidebar-overlay");
      overlay.setAttribute("aria-hidden", "true");
    }

    if (menuButton) {
      menuButton.classList.add("ja-sidebar-trigger");
      menuButton.setAttribute("aria-controls", "sidebar");
      menuButton.setAttribute("aria-expanded", "false");
    }

    if (sidebarToggle) {
      sidebarToggle.classList.add("ja-sidebar-close");
      sidebarToggle.setAttribute("type", "button");
    }

    var header = sidebar.querySelector(".sidebar-header");
    if (header) {
      header.classList.add("ja-sidebar-header");
    }

    var logo = sidebar.querySelector(".logo");
    if (logo) {
      logo.classList.add("ja-sidebar-brand");
    }

    var logoMark = sidebar.querySelector(".logo-img-placeholder");
    if (logoMark) {
      logoMark.classList.add("ja-sidebar-brand-mark");
    }

    var logoText = sidebar.querySelector(".logo-text");
    if (logoText) {
      logoText.classList.add("ja-sidebar-brand-copy");
    }

    var menu = sidebar.querySelector(".sidebar-menu");
    if (menu) {
      menu.classList.add("ja-sidebar-menu");
    }

    sidebar.querySelectorAll(".sidebar-menu a").forEach(function (link) {
      link.classList.add("ja-sidebar-link");
    });

    var inner = sidebar.querySelector(":scope > .ja-sidebar-inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "ja-sidebar-inner sidebar-inner";

      while (sidebar.firstChild) {
        inner.appendChild(sidebar.firstChild);
      }

      sidebar.appendChild(inner);
    }
  }

  function installSharedSidebar() {
    if (!isSidebarPage()) return;

    var sidebar = document.querySelector(".sidebar");
    var mainContent = document.querySelector(".main-content");
    var menuButton = document.getElementById("mobileMenuBtn");
    var overlay = document.getElementById("mobileOverlay");
    var sidebarToggle = document.getElementById("sidebarToggle");
    var mobileQuery = window.matchMedia("(max-width: 992px)");

    if (!sidebar) return;

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mobileOverlay";
      overlay.className = "mobile-overlay";
      document.body.appendChild(overlay);
    }

    normalizeSidebarStructure(sidebar, mainContent, overlay, menuButton, sidebarToggle);

    document.body.classList.add("ja-has-sidebar");

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    function isMobileViewport() {
      return mobileQuery.matches;
    }

    function syncToggleIcon() {
      if (!sidebarToggle) return;
      var icon = sidebarToggle.querySelector("i");
      if (!icon) return;

      if (isMobileViewport()) {
        icon.className = "fas fa-times";
        sidebarToggle.setAttribute("aria-label", "Close sidebar");
        return;
      }

      icon.className = "fas fa-chevron-left";
      sidebarToggle.setAttribute("aria-label", "Sidebar");
    }

    function closeMobileSidebar() {
      sidebar.classList.remove("mobile-open");
      overlay.classList.remove("show");
      document.body.classList.remove("ja-sidebar-open");
      document.body.style.overflow = "";
      if (menuButton) menuButton.setAttribute("aria-expanded", "false");
      syncToggleIcon();
    }

    function openMobileSidebar() {
      sidebar.classList.remove("collapsed");
      if (mainContent) mainContent.classList.remove("expanded");
      sidebar.classList.add("mobile-open");
      overlay.classList.add("show");
      document.body.classList.add("ja-sidebar-open");
      document.body.style.overflow = "hidden";
      if (menuButton) menuButton.setAttribute("aria-expanded", "true");
      syncToggleIcon();

      window.requestAnimationFrame(function () {
        resetSidebarScroll();
        var firstLink = sidebar.querySelector(".sidebar-menu a");
        if (firstLink) firstLink.focus({ preventScroll: true });
      });
    }

    function toggleMobileSidebar() {
      if (sidebar.classList.contains("mobile-open")) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    }

    function syncSidebarMode() {
      if (isMobileViewport()) {
        closeMobileSidebar();
        sidebar.classList.remove("collapsed");
        if (mainContent) mainContent.classList.remove("expanded");
      } else {
        closeMobileSidebar();
        sidebar.classList.remove("collapsed");
        if (mainContent) mainContent.classList.remove("expanded");
      }
      syncToggleIcon();
      resetPageScroll();
      resetSidebarScroll();
    }

    function resetSidebarPagePosition() {
      resetPageScroll();
      resetSidebarScroll();
    }

    document.addEventListener(
      "click",
      function (event) {
        if (!isSidebarPage()) return;

        var menuTrigger = event.target.closest("#mobileMenuBtn");
        if (menuTrigger && isMobileViewport()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          toggleMobileSidebar();
          return;
        }

        var overlayTrigger = event.target.closest("#mobileOverlay");
        if (overlayTrigger && isMobileViewport()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeMobileSidebar();
          return;
        }

        var toggleTrigger = event.target.closest("#sidebarToggle");
        if (toggleTrigger) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (isMobileViewport()) {
            closeMobileSidebar();
          }
          return;
        }

        var sidebarLink = event.target.closest(".sidebar a");
        if (sidebarLink && isMobileViewport()) {
          closeMobileSidebar();
        }
      },
      true
    );

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isMobileViewport() && sidebar.classList.contains("mobile-open")) {
        closeMobileSidebar();
      }
    });

    syncSidebarMode();
    resetSidebarPagePosition();

    window.requestAnimationFrame(function () {
      resetSidebarPagePosition();
      window.setTimeout(resetSidebarPagePosition, 60);
    });

    window.addEventListener(
      "load",
      function () {
        syncSidebarMode();
        window.requestAnimationFrame(resetSidebarPagePosition);
      },
      { once: true }
    );

    window.addEventListener("pageshow", function () {
      syncSidebarMode();
      window.requestAnimationFrame(function () {
        resetSidebarPagePosition();
        window.setTimeout(resetSidebarPagePosition, 80);
      });
    });

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncSidebarMode);
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(syncSidebarMode);
    }
  }

  onReady(function () {
    document.body.classList.add("ja-ready");
    installToastSystem();
    installSharedSidebar();
    normalizeLogoutModal();
    enhanceButtonLabels();
    enhanceEmptyStates();
    installLoadingFeedback();
  });
})();
