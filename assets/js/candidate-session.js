(function () {
  const CURRENT_USER_KEY = "jobassist_current_user";
  const APPLICATIONS_KEY = "jobassist_applications";
  const CANDIDATE_IMAGE_STORE_KEY = "jobassist_candidate_images";
  const CANDIDATES_KEY = "jobassist_candidates";
  const DEFAULT_CANDIDATE_AVATAR =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%20role%3D%22img%22%20aria-label%3D%22C%22%3E%3Crect%20width%3D%22160%22%20height%3D%22160%22%20rx%3D%2280%22%20fill%3D%22%230a2a66%22/%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22central%22%20text-anchor%3D%22middle%22%20fill%3D%22%23ffffff%22%20font-family%3D%22Poppins%2C%20Arial%2C%20sans-serif%22%20font-size%3D%2272%22%20font-weight%3D%22700%22%3EC%3C/text%3E%3C/svg%3E";

  function safeJSONParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function safeGetJSON(storage, key, fallback) {
    const parsed = safeJSONParse(storage.getItem(key));
    return parsed === null || parsed === undefined ? fallback : parsed;
  }

  function safeSetJSON(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Unable to persist storage key "' + key + '":', error);
      return false;
    }
  }

  function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function deriveCandidateId(candidate) {
    const explicitId = String(
      candidate?.id || candidate?.candidateId || candidate?.userId || ""
    ).trim();
    if (explicitId) {
      return explicitId;
    }

    const phone = normalizePhone(candidate?.phone);
    if (phone) {
      return "temp-candidate-" + phone;
    }

    const email = normalizeEmail(candidate?.email);
    if (email) {
      return "temp-candidate-" + email.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }

    return "";
  }

  function stripCandidateImageFields(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return {};
    }

    const {
      passportImage,
      avatar,
      image,
      profileImage,
      photo,
      profilePicture,
      passportPhoto,
      picture,
      candidateImage,
      candidatePhoto,
      ...rest
    } = candidate;

    return rest;
  }

  function createCandidateSessionProfile(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return {};
    }

    const sessionProfile = stripCandidateImageFields(candidate);
    const candidateId = deriveCandidateId(sessionProfile);
    const normalizedSkills = Array.isArray(sessionProfile.skills)
      ? sessionProfile.skills
          .map((skill) => String(skill || "").trim())
          .filter(Boolean)
          .slice(0, 3)
      : String(sessionProfile.skills || "")
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
          .slice(0, 3);

    return {
      userType: "candidate",
      id: candidateId,
      candidateId: candidateId,
      fullName: String(sessionProfile.fullName || sessionProfile.name || "").trim() || "Candidate",
      email: normalizeEmail(sessionProfile.email),
      phone: normalizePhone(sessionProfile.phone),
      gender: String(sessionProfile.gender || "").trim(),
      region: String(sessionProfile.region || "").trim(),
      willingToRelocate: String(sessionProfile.willingToRelocate || sessionProfile.workOutside || "").trim(),
      fieldOfStudy: String(sessionProfile.fieldOfStudy || sessionProfile.course || "").trim(),
      preferredIndustry: String(sessionProfile.preferredIndustry || "").trim(),
      experienceLevel: String(sessionProfile.experienceLevel || sessionProfile.experience || "").trim(),
      highestEducationLevel: String(sessionProfile.highestEducationLevel || sessionProfile.educationLevel || sessionProfile.education || "").trim(),
      educationLevel: String(sessionProfile.highestEducationLevel || sessionProfile.educationLevel || sessionProfile.education || "").trim(),
      disabilityStatus: String(sessionProfile.disabilityStatus || sessionProfile.disabled || "").trim(),
      digitalAddress: String(sessionProfile.digitalAddress || "").trim(),
      ghanaCardNumber: String(sessionProfile.ghanaCardNumber || sessionProfile.ghanaCard || "").trim(),
      nssNumber: String(sessionProfile.nssNumber || "").trim(),
      isShsGraduate: Boolean(sessionProfile.isShsGraduate),
      dateOfBirth: String(sessionProfile.dateOfBirth || "").trim(),
      bio: String(sessionProfile.bio || "").trim(),
      skills: normalizedSkills,
      createdAt: sessionProfile.createdAt || new Date().toISOString(),
      password: String(sessionProfile.password || "").trim(),
    };
  }

  function getCurrentUser() {
    const user = safeGetJSON(localStorage, CURRENT_USER_KEY, null);
    return user && typeof user === "object" ? user : null;
  }

  function getCurrentCandidate() {
    const user = getCurrentUser();
    if (!user || String(user.userType || "").trim().toLowerCase() !== "candidate") {
      return {};
    }
    return createCandidateSessionProfile(user);
  }

  function setCurrentUser(user) {
    const nextUser = createCandidateSessionProfile(user);
    safeSetJSON(localStorage, CURRENT_USER_KEY, nextUser);
    upsertCandidateAccount({
      ...nextUser,
      password: String(user?.password || nextUser.password || "").trim(),
    });
    return nextUser;
  }

  function getCandidateAccounts() {
    const candidates = safeGetJSON(localStorage, CANDIDATES_KEY, []);
    return Array.isArray(candidates) ? candidates : [];
  }

  function saveCandidateAccounts(candidates) {
    safeSetJSON(localStorage, CANDIDATES_KEY, Array.isArray(candidates) ? candidates : []);
  }

  function findCandidateAccountIndex(accounts, candidate) {
    const candidateId = getCandidateId(candidate);
    const candidatePhone = normalizePhone(candidate?.phone);
    const candidateEmail = normalizeEmail(candidate?.email);

    return accounts.findIndex(function (entry) {
      const entryId = getCandidateId(entry);
      const entryPhone = normalizePhone(entry?.phone);
      const entryEmail = normalizeEmail(entry?.email);

      return (
        Boolean(candidateId && entryId && candidateId === entryId) ||
        Boolean(candidatePhone && entryPhone && candidatePhone === entryPhone) ||
        Boolean(candidateEmail && entryEmail && candidateEmail === entryEmail)
      );
    });
  }

  function upsertCandidateAccount(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return {};
    }

    const accounts = getCandidateAccounts();
    const index = findCandidateAccountIndex(accounts, candidate);
    const existing = index >= 0 ? accounts[index] || {} : {};
    const normalized = createCandidateSessionProfile({
      ...existing,
      ...candidate,
      password: String(candidate?.password || existing?.password || "").trim(),
    });

    if (index >= 0) {
      accounts[index] = normalized;
    } else {
      accounts.push(normalized);
    }

    saveCandidateAccounts(accounts);
    return normalized;
  }

  function authenticateCandidate(phone, password) {
    const normalizedPhone = normalizePhone(phone);
    const normalizedPassword = String(password || "").trim();

    if (!normalizedPhone || !normalizedPassword) {
      return null;
    }

    const matchedAccount = getCandidateAccounts().find(function (candidate) {
      return (
        normalizePhone(candidate?.phone) === normalizedPhone &&
        String(candidate?.password || "").trim() === normalizedPassword
      );
    });

    if (matchedAccount) {
      return createCandidateSessionProfile(matchedAccount);
    }

    const currentUser = getCurrentUser();
    if (
      currentUser &&
      String(currentUser.userType || "").trim().toLowerCase() === "candidate" &&
      normalizePhone(currentUser?.phone) === normalizedPhone &&
      String(currentUser?.password || "").trim() === normalizedPassword
    ) {
      return createCandidateSessionProfile(currentUser);
    }

    return null;
  }

  function clearSession() {
    [
      CURRENT_USER_KEY,
      "jobassist_current_candidate",
      "candidate",
      "jobassist_current_employer",
      "jobassist_candidate_signup_temp",
      "jobassist_passport_temp",
      "signupType",
      "jobassist_candidate_boost_context",
      "current_application_id",
      "jobassist_payment_data",
      "paymentData",
      "jobassist_candidate_signup",
      "jobassist_candidate_signup_data",
      "jobassist_candidate_signup_image",
      "jobassist_temp_candidate",
      "appliedJobs",
      "acceptedOffers",
      "jobassist_jobs_catalog",
      "profilePhoto",
      "candidatePhoto",
      "candidateImage",
      "passportPhoto",
      "profilePicture",
      "picture",
    ].forEach(function (key) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  function requireCandidateAuth() {
    const currentCandidate = getCurrentCandidate();
    if (!getCandidateId(currentCandidate)) {
      window.location.href = "../login.html";
      return null;
    }
    return currentCandidate;
  }

  function getCandidateId(candidate) {
    return deriveCandidateId(candidate);
  }

  function getCandidateEmail(candidate) {
    return normalizeEmail(candidate?.email);
  }

  function getCandidateFullName(candidate) {
    return String(candidate?.fullName || candidate?.name || "").trim();
  }

  function getCandidateFirstName(candidate) {
    const fullName = getCandidateFullName(candidate);
    return fullName ? fullName.split(/\s+/)[0] : "";
  }

  function getCandidateInitial(candidate) {
    const fullName = getCandidateFullName(candidate);
    if (fullName) {
      return fullName.charAt(0).toUpperCase();
    }

    const email = getCandidateEmail(candidate);
    if (email) {
      return email.charAt(0).toUpperCase();
    }

    return "C";
  }

  function createInitialAvatarDataUri(label) {
    const initial = String(label || "C").trim().charAt(0).toUpperCase() || "C";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="${initial}">
        <rect width="160" height="160" rx="80" fill="#0a2a66"/>
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="72" font-weight="700">${initial}</text>
      </svg>
    `;

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.replace(/\s+/g, " ").trim());
  }

  function isUsableCandidateImageSource(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return false;
    }

    if (/default-avatar|placeholder|pravatar/i.test(normalized)) {
      return false;
    }

    return (
      /^data:image\//i.test(normalized) ||
      /^blob:/i.test(normalized) ||
      /^https?:\/\//i.test(normalized)
    );
  }

  function getCandidateImageStore() {
    const store = safeGetJSON(localStorage, CANDIDATE_IMAGE_STORE_KEY, {});
    return store && typeof store === "object" && !Array.isArray(store) ? store : {};
  }

  function saveCandidateImageStore(store) {
    return safeSetJSON(localStorage, CANDIDATE_IMAGE_STORE_KEY, store);
  }

  function persistCandidateImage(candidate, imageData) {
    const candidateId = getCandidateId(candidate);
    if (!candidateId) {
      return "";
    }

    const store = getCandidateImageStore();
    const normalizedImage = String(imageData || "").trim();

    if (isUsableCandidateImageSource(normalizedImage)) {
      store[candidateId] = normalizedImage;
    } else {
      delete store[candidateId];
    }

    saveCandidateImageStore(store);
    return normalizedImage;
  }

  function getCandidateImage(candidateOrId) {
    const store = getCandidateImageStore();
    const candidateId =
      typeof candidateOrId === "object"
        ? getCandidateId(candidateOrId)
        : String(candidateOrId || "").trim();
    const storedValue = String(store[candidateId] || "").trim();
    return isUsableCandidateImageSource(storedValue) ? storedValue : "";
  }

  function getCandidateStoredImage(candidate) {
    return getCandidateImage(candidate);
  }

  function getCandidateAvatar(candidate) {
    return getCandidateStoredImage(candidate) || createInitialAvatarDataUri(getCandidateInitial(candidate));
  }

  function isApplicationForCurrentCandidate(application, candidate) {
    const currentCandidate = candidate || getCurrentCandidate();
    const candidateId = getCandidateId(currentCandidate);
    const applicationCandidateId = String(application?.candidateId || "").trim();

    if (candidateId && applicationCandidateId) {
      return candidateId === applicationCandidateId;
    }

    const candidateEmail = getCandidateEmail(currentCandidate);
    const applicationEmail = normalizeEmail(application?.email);
    return candidateEmail && applicationEmail ? candidateEmail === applicationEmail : false;
  }

  function getCandidateApplications() {
    const candidate = getCurrentCandidate();
    const applications = safeGetJSON(localStorage, APPLICATIONS_KEY, []);
    const items = Array.isArray(applications) ? applications : [];

    return items
      .filter(function (application) {
        return isApplicationForCurrentCandidate(application, candidate);
      })
      .sort(function (a, b) {
        return new Date(b?.appliedAt || 0) - new Date(a?.appliedAt || 0);
      });
  }

  function getEmployerJobs() {
    const jobs = safeGetJSON(localStorage, "jobassist_employer_jobs", []);
    return Array.isArray(jobs) ? jobs : [];
  }

  function findEmployerJobById(jobId) {
    return (
      getEmployerJobs().find(function (job) {
        return String(job?.jobId || job?.id || "").trim() === String(jobId || "").trim();
      }) || null
    );
  }

  function hydrateCandidateSession(profileInput) {
    const input = profileInput && typeof profileInput === "object" ? profileInput : {};
    const baseProfile = createCandidateSessionProfile(input);
    const currentUser = getCurrentUser();
    const currentSessionMatch =
      currentUser &&
      String(currentUser.userType || "").trim().toLowerCase() === "candidate" &&
      getCandidateId(currentUser) === getCandidateId(baseProfile)
        ? currentUser
        : null;

    const relatedApplications = (safeGetJSON(localStorage, APPLICATIONS_KEY, []) || []).filter(
      function (application) {
        return isApplicationForCurrentCandidate(application, baseProfile);
      }
    );
    const latestApplication = relatedApplications
      .slice()
      .sort(function (a, b) {
        return new Date(b?.appliedAt || 0) - new Date(a?.appliedAt || 0);
      })[0];

    return createCandidateSessionProfile({
      ...currentSessionMatch,
      ...latestApplication,
      ...input,
      id: getCandidateId(baseProfile),
      candidateId: getCandidateId(baseProfile),
      fullName:
        input.fullName ||
        currentSessionMatch?.fullName ||
        latestApplication?.fullName ||
        latestApplication?.name ||
        "",
      email: input.email || currentSessionMatch?.email || latestApplication?.email || "",
      phone: input.phone || currentSessionMatch?.phone || latestApplication?.phone || "",
    });
  }

  function getReadNotificationIds() {
    const ids = safeGetJSON(localStorage, "jobassist_candidate_notification_reads", []);
    return Array.isArray(ids) ? ids : [];
  }

  function saveReadNotificationIds(ids) {
    safeSetJSON(localStorage, "jobassist_candidate_notification_reads", ids);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStoredCandidateNotifications() {
    const notifications = safeGetJSON(localStorage, "jobassist_candidate_notifications", []);
    return Array.isArray(notifications) ? notifications : [];
  }

  function isNotificationForCurrentCandidate(notification, candidate) {
    const candidateId = getCandidateId(candidate);
    const candidateEmail = getCandidateEmail(candidate);
    const notificationCandidateId = String(notification?.candidateId || "").trim();
    const notificationEmail = normalizeEmail(notification?.candidateEmail || notification?.email);

    if (candidateId && notificationCandidateId) {
      return candidateId === notificationCandidateId;
    }

    return Boolean(candidateEmail && notificationEmail && candidateEmail === notificationEmail);
  }

  function getCompanyName(application, job) {
    return (
      application?.company ||
      job?.companyName ||
      job?.company ||
      job?.businessName ||
      "Company not provided"
    );
  }

  function buildCandidateNotifications() {
    const candidate = getCurrentCandidate();
    const readIds = new Set(getReadNotificationIds());
    const explicitNotifications = getStoredCandidateNotifications()
      .filter(function (notification) {
        return isNotificationForCurrentCandidate(notification, candidate);
      })
      .map(function (notification) {
        const notificationId = String(notification?.id || "").trim() || "candidate-notification-" + Date.now();
        return {
          id: notificationId,
          createdAt: notification?.createdAt || new Date().toISOString(),
          isRead: Boolean(notification?.read) || readIds.has(notificationId),
          message: notification?.message || "You have a new notification.",
        };
      });
    const explicitApplicationStatusIds = new Set(
      getStoredCandidateNotifications()
        .filter(function (notification) {
          return (
            String(notification?.type || "") === "application-status" &&
            isNotificationForCurrentCandidate(notification, candidate)
          );
        })
        .map(function (notification) {
          return String(notification?.applicationId || "").trim();
        })
        .filter(Boolean)
    );

    const applicationNotifications = getCandidateApplications()
      .filter(function (application) {
        const applicationId = String(application?.applicationId || application?.id || "").trim();
        const status = String(application?.status || "").toLowerCase();
        return !(
          applicationId &&
          explicitApplicationStatusIds.has(applicationId) &&
          (status === "accepted" || status === "rejected")
        );
      })
      .slice(0, 5)
      .map(function (application) {
        const jobId = String(application?.jobId || application?.id || "");
        const linkedJob = findEmployerJobById(jobId);
        const jobTitle =
          application?.title ||
          application?.jobTitle ||
          linkedJob?.jobTitle ||
          linkedJob?.title ||
          "your job application";
        const company = getCompanyName(application, linkedJob);
        const status = String(application?.status || "").toLowerCase();
        let message = "Application submitted successfully.";

        if (status === "accepted" || application?.accepted) {
          message = "Your offer has been accepted and is ready for follow-up.";
        } else if (status === "rejected" || application?.rejected || application?.withdrawn) {
          message = "One of your applications was not selected for the next step.";
        } else if (application?.tier === "premium") {
          message = "Your premium application is active and visible to employers.";
        }

        const notificationId =
          "candidate-" + String(application?.applicationId || application?.id || jobId || Date.now());

        return {
          id: notificationId,
          createdAt:
            application?.acceptedAt ||
            application?.updatedAt ||
            application?.appliedAt ||
            new Date().toISOString(),
          isRead: readIds.has(notificationId),
          message: message + " " + jobTitle + " at " + company + ".",
        };
      });

    return explicitNotifications
      .concat(applicationNotifications)
      .sort(function (a, b) {
        return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
      })
      .slice(0, 8);
  }

  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMinutes < 60) return diffMinutes + " min ago";

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return diffHours + " hour" + (diffHours === 1 ? "" : "s") + " ago";

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return diffDays + " day" + (diffDays === 1 ? "" : "s") + " ago";

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function renderCandidateHeader() {
    const candidate = getCurrentCandidate();
    const firstName = getCandidateFirstName(candidate);
    const fullName = getCandidateFullName(candidate);
    const avatarSrc = getCandidateAvatar(candidate);

    document.querySelectorAll(".user-name").forEach(function (element) {
      element.textContent = firstName || fullName || "";
    });

    document
      .querySelectorAll(
        "img#currentUserAvatar, img#profileAvatar, img#settingsProfileAvatar, img#dashboardAvatar, .user-avatar img"
      )
      .forEach(function (image) {
        image.src = avatarSrc || createInitialAvatarDataUri(getCandidateInitial(candidate));
        image.alt = fullName || "Candidate";
      });

    const list =
      document.getElementById("candidateNotificationList") ||
      document.querySelector(".notification-list");
    const badge =
      document.getElementById("notificationBadge") ||
      document.querySelector(".notification-badge");
    const markAllButton =
      document.getElementById("markAllRead") ||
      document.querySelector(".mark-all-read");
    const notifications = buildCandidateNotifications();

    if (list) {
      list.innerHTML = "";

      if (!notifications.length) {
        list.innerHTML =
          '<li class="notification-item"><div class="notification-content">No notifications yet</div><div class="notification-time">-</div></li>';
      } else {
        notifications.forEach(function (notification) {
          const item = document.createElement("li");
          item.className = "notification-item" + (notification.isRead ? "" : " unread");
          item.innerHTML =
            '<div class="notification-content">' +
            escapeHtml(notification.message) +
            "</div>" +
            '<div class="notification-time">' +
            formatTimeAgo(notification.createdAt) +
            "</div>";
          list.appendChild(item);
        });
      }
    }

    if (badge) {
      const unreadCount = notifications.filter(function (notification) {
        return !notification.isRead;
      }).length;
      if (unreadCount > 0) {
        badge.style.display = "flex";
        badge.textContent = String(unreadCount);
      } else {
        badge.style.display = "none";
      }
    }

    if (markAllButton && !markAllButton.dataset.candidateNotificationsBound) {
      markAllButton.dataset.candidateNotificationsBound = "true";
      markAllButton.addEventListener("click", function () {
        saveReadNotificationIds(
          buildCandidateNotifications().map(function (notification) {
            return notification.id;
          })
        );
        renderCandidateHeader();
      });
    }
  }

  window.JobAssistCandidateSession = {
    CURRENT_USER_KEY: CURRENT_USER_KEY,
    CANDIDATES_KEY: CANDIDATES_KEY,
    CANDIDATE_IMAGE_STORE_KEY: CANDIDATE_IMAGE_STORE_KEY,
    safeJSONParse: safeJSONParse,
    safeGetJSON: safeGetJSON,
    safeSetJSON: safeSetJSON,
    normalizePhone: normalizePhone,
    stripCandidateImageFields: stripCandidateImageFields,
    createCandidateSessionProfile: createCandidateSessionProfile,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    getCandidateAccounts: getCandidateAccounts,
    saveCandidateAccounts: saveCandidateAccounts,
    upsertCandidateAccount: upsertCandidateAccount,
    authenticateCandidate: authenticateCandidate,
    clearSession: clearSession,
    clearCandidateSession: clearSession,
    requireCandidateAuth: requireCandidateAuth,
    getCurrentCandidate: getCurrentCandidate,
    getCandidateId: getCandidateId,
    getCandidateEmail: getCandidateEmail,
    getCandidateFullName: getCandidateFullName,
    getCandidateFirstName: getCandidateFirstName,
    getCandidateInitial: getCandidateInitial,
    createInitialAvatarDataUri: createInitialAvatarDataUri,
    getCandidateImageStore: getCandidateImageStore,
    saveCandidateImageStore: saveCandidateImageStore,
    persistCandidateImage: persistCandidateImage,
    getCandidateImage: getCandidateImage,
    getCandidateStoredImage: getCandidateStoredImage,
    getCandidateAvatar: getCandidateAvatar,
    isApplicationForCurrentCandidate: isApplicationForCurrentCandidate,
    getCandidateApplications: getCandidateApplications,
    getEmployerJobs: getEmployerJobs,
    findEmployerJobById: findEmployerJobById,
    hydrateCandidateSession: hydrateCandidateSession,
    buildCandidateNotifications: buildCandidateNotifications,
    saveReadNotificationIds: saveReadNotificationIds,
    renderCandidateHeader: renderCandidateHeader,
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.includes("/candidate/")) {
      requireCandidateAuth();
    }

    renderCandidateHeader();

    const confirmLogoutButton = document.getElementById("confirmLogout");
    if (confirmLogoutButton && !confirmLogoutButton.dataset.candidateSessionBound) {
      confirmLogoutButton.dataset.candidateSessionBound = "true";
      confirmLogoutButton.addEventListener("click", async function () {
        if (window.JobAssistAPI) {
          await JobAssistAPI.Auth.logout().catch(function () {});
        }
        clearSession();
        window.location.href = "/login.html";
      });
    }
  });
})();
