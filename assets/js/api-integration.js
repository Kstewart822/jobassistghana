/**
 * JobAssist API Integration Module
 * Handles all API communication with the backend
 */

(function () {
  // API Configuration
  const API_CONFIG = {
    BASE_URL: "http://localhost:5000/api",
    TIMEOUT: 10000,
    HEADERS: {
      "Content-Type": "application/json",
    },
  };

  // Token storage keys
  const TOKEN_KEY = "jobassist_access_token";
  const REFRESH_TOKEN_KEY = "jobassist_refresh_token";
  const USER_KEY = "jobassist_user";

  /**
   * Get stored access token
   */
  function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  function getStoredUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Store tokens and user data
   */
  function storeAuthData(accessToken, refreshToken, user) {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) {
      // Ensure userType is set from role for full compatibility
      const userData = { ...user };
      if (!userData.userType && userData.role) {
        userData.userType = userData.role;
      }
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      // Store in jobassist_current_user for candidate-session.js compatibility
      localStorage.setItem('jobassist_current_user', JSON.stringify(userData));
      // Store in jobassist_current_employer for employer pages compatibility
      if (userData.role === 'employer') {
        localStorage.setItem('jobassist_current_employer', JSON.stringify(userData));
      } else {
        localStorage.removeItem('jobassist_current_employer');
      }
    }
  }

  /**
   * Clear authentication data
   */
  function clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('jobassist_current_user');
    localStorage.removeItem('jobassist_current_employer');
    localStorage.removeItem('jobassist_employer_jobs');
    localStorage.removeItem('jobassist_applications');
  }

  /**
   * Check if user is authenticated
   */
  function isAuthenticated() {
    return !!getAccessToken();
  }

  /**
   * Get current user
   */
  function getCurrentUser() {
    return getStoredUser();
  }

  /**
   * Make API request
   */
  async function request(method, endpoint, data = null, token = null) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    const options = {
      method,
      headers: { ...API_CONFIG.HEADERS },
    };

    // Use provided token or stored token
    const authToken = token || getAccessToken();
    if (authToken) {
      options.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timeout")),
            API_CONFIG.TIMEOUT,
          ),
        ),
      ]);

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401) {
          clearAuthData();
          // Redirect to login
          if (window.location.pathname !== "/login.html") {
            window.location.href = "/login.html";
          }
        }
        throw {
          status: response.status,
          message: responseData.message || "API Error",
          errors: responseData.errors,
          data: responseData,
        };
      }

      return {
        success: true,
        status: response.status,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        status: error.status || 0,
        message: error.message || "Network error",
        errors: error.errors,
        error,
      };
    }
  }

  /**
   * AUTH ENDPOINTS
   */
  const Auth = {
    // Register new user
    async register(userData) {
      return request("POST", "/auth/register", {
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword,
        name: userData.name,
        role: userData.role, // 'candidate' or 'employer'
      });
    },

    // Login user
    async login(email, password) {
      const result = await request("POST", "/auth/login", {
        email,
        password,
      });

      if (result.success && result.data?.data) {
        const { accessToken, refreshToken, user } = result.data.data;
        storeAuthData(accessToken, refreshToken, user);
      }

      return result;
    },

    // Logout
    async logout() {
      await request("POST", "/auth/logout");
      clearAuthData();
      return { success: true };
    },

    // Get current user profile
    async getProfile() {
      return request("GET", "/auth/profile");
    },

    // Update profile
    async updateProfile(updates) {
      return request("PUT", "/auth/profile", updates);
    },

    // Change password
    async changePassword(oldPassword, newPassword, confirmPassword) {
      return request("POST", "/auth/change-password", {
        oldPassword,
        newPassword,
        confirmPassword,
      });
    },

    // Refresh token
    async refreshToken() {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return { success: false, message: "No refresh token" };

      return request("POST", "/auth/refresh-token", {
        refreshToken,
      });
    },

    // Forgot password
    async forgotPassword(email) {
      return request("POST", "/auth/forgot-password", { email });
    },

    // Reset password
    async resetPassword(resetToken, newPassword, confirmPassword) {
      return request("POST", "/auth/reset-password", {
        resetToken,
        newPassword,
        confirmPassword,
      });
    },
  };

  /**
   * JOB ENDPOINTS
   */
  const Jobs = {
    // List all jobs
    async listJobs(filters = {}) {
      const params = new URLSearchParams();
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);
      if (filters.category) params.append("category", filters.category);
      if (filters.location) params.append("location", filters.location);
      if (filters.jobType) params.append("jobType", filters.jobType);

      const queryString = params.toString();
      return request("GET", `/jobs${queryString ? "?" + queryString : ""}`);
    },

    // Search jobs
    async searchJobs(query, filters = {}) {
      const params = new URLSearchParams({ q: query });
      if (filters.category) params.append("category", filters.category);
      if (filters.jobType) params.append("jobType", filters.jobType);
      if (filters.minSalary) params.append("minSalary", filters.minSalary);
      if (filters.maxSalary) params.append("maxSalary", filters.maxSalary);
      if (filters.location) params.append("location", filters.location);
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      return request("GET", `/jobs/search?${params.toString()}`);
    },

    // Get single job
    async getJobById(jobId) {
      return request("GET", `/jobs/${jobId}`);
    },

    // Get jobs by employer
    async getJobsByEmployer(employerId) {
      return request("GET", `/jobs/employer/${employerId}`);
    },

    // Create job (employer)
    async createJob(jobData) {
      return request("POST", "/jobs", jobData);
    },

    // Update job
    async updateJob(jobId, updates) {
      return request("PUT", `/jobs/${jobId}`, updates);
    },

    // Publish job
    async publishJob(jobId) {
      return request("POST", `/jobs/${jobId}/publish`, {});
    },

    // Close job
    async closeJob(jobId) {
      return request("POST", `/jobs/${jobId}/close`, {});
    },

    // Delete job
    async deleteJob(jobId) {
      return request("DELETE", `/jobs/${jobId}`);
    },
  };

  /**
   * APPLICATION ENDPOINTS
   */
  const Applications = {
    // Submit application
    async submitApplication(jobId, coverLetter = "") {
      return request("POST", "/applications", {
        jobId,
        coverLetter,
      });
    },

    // Get candidate's applications
    async getMyApplications(filters = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      return request(
        "GET",
        `/applications/me${params.toString() ? "?" + params.toString() : ""}`,
      );
    },

    // Get single application
    async getApplication(applicationId) {
      return request("GET", `/applications/${applicationId}`);
    },

    // Withdraw application
    async withdrawApplication(applicationId) {
      return request("POST", `/applications/${applicationId}/withdraw`, {});
    },

    // Get employer applications
    async getEmployerApplications(filters = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.jobId) params.append("jobId", filters.jobId);
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      return request(
        "GET",
        `/applications/employer${params.toString() ? "?" + params.toString() : ""}`,
      );
    },

    // Update application status
    async updateApplicationStatus(applicationId, status) {
      return request("PATCH", `/applications/${applicationId}/status`, {
        status,
      });
    },

    // Schedule interview
    async scheduleInterview(applicationId, interviewData) {
      return request(
        "POST",
        `/applications/${applicationId}/interview`,
        interviewData,
      );
    },

    // Add document
    async addDocument(applicationId, documentType) {
      return request("POST", `/applications/${applicationId}/documents`, {
        documentType,
      });
    },

    // Get application documents
    async getDocuments(applicationId) {
      return request("GET", `/applications/${applicationId}/documents`);
    },

    // Delete application
    async deleteApplication(applicationId) {
      return request("DELETE", `/applications/${applicationId}`);
    },
  };

  /**
   * SESSION ENDPOINTS
   */
  const Sessions = {
    // Get current session
    async getCurrentSession() {
      return request("GET", "/sessions/current");
    },

    // Get all active sessions
    async getActiveSessions() {
      return request("GET", "/sessions/active");
    },

    // Logout current session
    async logoutCurrentSession() {
      return request("DELETE", "/sessions/current");
    },

    // Logout specific session
    async logoutSession(sessionId) {
      return request("DELETE", `/sessions/${sessionId}`);
    },

    // Logout all sessions
    async logoutAllSessions() {
      return request("DELETE", "/sessions");
    },

    // Sync localStorage with backend session
    async syncSessionData() {
      const result = await this.getCurrentSession();
      if (result.success && result.data) {
        // Store session data if needed
        localStorage.setItem("jobassist_session", JSON.stringify(result.data));
        return result.data;
      }
      return null;
    },
  };

  /**
   * UTILITY FUNCTIONS
   */
  const Utils = {
    // Check if user is authenticated
    isAuthenticated,

    // Get current user
    getCurrentUser,

    // Check if user is employer
    isEmployer: () => {
      const user = getCurrentUser();
      return user?.role === "employer";
    },

    // Check if user is candidate
    isCandidate: () => {
      const user = getCurrentUser();
      return user?.role === "candidate";
    },

    // Redirect to login if not authenticated
    requireAuth: (redirect = true) => {
      if (!isAuthenticated()) {
        if (redirect) {
          window.location.href = "/login.html";
        }
        return false;
      }
      return true;
    },

    // Redirect to login if not employer
    requireEmployer: (redirect = true) => {
      const user = getCurrentUser();
      if (!user || user.role !== "employer") {
        if (redirect) {
          window.location.href = "/employer-login.html";
        }
        return false;
      }
      return true;
    },

    // Get authorization header
    getAuthHeader: () => {
      const token = getAccessToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    // Logout and redirect
    logout: async () => {
      try {
        if (getAccessToken()) {
          await request("POST", "/auth/logout");
        }
      } catch (e) {
        // Ignore API errors during logout
      }
      clearAuthData();
      window.location.href = "/index.html";
    },
  };

  /**
   * Expose API globally
   */
  window.JobAssistAPI = {
    Auth,
    Jobs,
    Applications,
    Sessions,
    Utils,
    config: API_CONFIG,
    getAccessToken,
    getRefreshToken,
    getStoredUser,
    storeAuthData,
    clearAuthData,
    isAuthenticated,
    getCurrentUser,
  };

  // Log when API is loaded
  console.log("JobAssist API Integration loaded successfully");
})();
