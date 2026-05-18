(function () {
  const EYE_SVG = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>`;

  const EYE_OFF_SVG = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 3l18 18"></path>
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4"></path>
      <path d="M9.9 4.3A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-3.2 4.2"></path>
      <path d="M6.1 6.1C2.8 8.3 1 12 1 12s4 8 11 8a11.2 11.2 0 0 0 5.9-1.7"></path>
    </svg>`;

  const WRAPPER_SELECTOR =
    ".password-field, .password-wrapper, .password-input-wrapper, .input-wrap.password-wrap";

  function resolveInput(toggle) {
    const wrapper = toggle.closest(WRAPPER_SELECTOR);
    const wrapperInput = wrapper?.querySelector("input");
    if (wrapperInput) return wrapperInput;

    const targetId = toggle.getAttribute("data-target");
    return targetId ? document.getElementById(targetId) : null;
  }

  function renderToggle(toggle, isVisible) {
    toggle.classList.toggle("is-visible", isVisible);
    toggle.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", isVisible ? "true" : "false");
    toggle.innerHTML = isVisible ? EYE_OFF_SVG : EYE_SVG;
  }

  function bindToggle(toggle) {
    if (!toggle || toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";
    toggle.setAttribute("type", "button");

    const input = resolveInput(toggle);
    renderToggle(toggle, !!input && input.type === "text");

    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const targetInput = resolveInput(toggle);
      if (!targetInput) return;

      const isHidden = targetInput.type === "password";
      targetInput.type = isHidden ? "text" : "password";
      renderToggle(toggle, isHidden);
    });
  }

  function initPasswordToggles(root = document) {
    root.querySelectorAll(".password-toggle").forEach(bindToggle);
  }

  window.JobAssistPasswordToggle = {
    initPasswordToggles,
    EYE_SVG,
    EYE_OFF_SVG,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initPasswordToggles(), {
      once: true,
    });
  } else {
    initPasswordToggles();
  }
})();
