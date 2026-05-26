/**
 * JobAssist Token Refresh Handler
 * Manages JWT token expiry and automatic refresh
 */

(function() {
  const TOKEN_KEY = 'jobassist_access_token';
  const REFRESH_TOKEN_KEY = 'jobassist_refresh_token';
  const TOKEN_EXPIRY_KEY = 'jobassist_token_expiry';

  /**
   * Check if access token is expired
   */
  function isTokenExpired(token) {
    if (!token) return true;

    try {
      // Decode JWT payload (doesn't verify signature, just decodes)
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const expiryTime = (payload.exp || 0) * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      return currentTime > expiryTime;
    } catch (error) {
      console.warn('Error checking token expiry:', error);
      return true;
    }
  }

  /**
   * Get time until token expiry in milliseconds
   */
  function getTimeUntilExpiry(token) {
    if (!token) return 0;

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      const expiryTime = (payload.exp || 0) * 1000;
      const timeLeft = expiryTime - Date.now();

      return Math.max(0, timeLeft);
    } catch {
      return 0;
    }
  }

  /**
   * Refresh the access token
   */
  async function refreshAccessToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      console.warn('No refresh token available');
      clearTokens();
      return false;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        console.warn('Token refresh failed:', response.status);
        clearTokens();
        return false;
      }

      const data = await response.json();

      if (data.data?.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.data.accessToken);

        if (data.data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
        }

        console.log('Token refreshed successfully');
        return true;
      }

      clearTokens();
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearTokens();
      return false;
    }
  }

  /**
   * Clear stored tokens
   */
  function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem('jobassist_user');
  }

  /**
   * Get current access token, refreshing if necessary
   */
  async function getValidAccessToken() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return null;
    }

    if (isTokenExpired(token)) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        return null;
      }
      return localStorage.getItem(TOKEN_KEY);
    }

    return token;
  }

  /**
   * Setup automatic token refresh before expiry
   * Refreshes token 1 minute before expiry
   */
  function setupAutoRefresh() {
    const checkAndRefresh = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        return; // No token to refresh
      }

      const timeUntilExpiry = getTimeUntilExpiry(token);
      const refreshThreshold = 60000; // 1 minute

      if (timeUntilExpiry < refreshThreshold && timeUntilExpiry > 0) {
        console.log('Token expiring soon, refreshing...');
        await refreshAccessToken();
      } else if (timeUntilExpiry <= 0) {
        console.log('Token expired, clearing...');
        clearTokens();
      }
    };

    // Check every 30 seconds
    setInterval(checkAndRefresh, 30000);

    // Initial check
    checkAndRefresh();

    // Also check on visibility change (when user comes back from another tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    });
  }

  /**
   * Redirect to login if token is invalid
   */
  function redirectToLoginIfNeeded() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token || isTokenExpired(token)) {
      const currentPath = window.location.pathname;

      // Only redirect if not already on login pages
      if (
        !currentPath.includes('/login.html') &&
        !currentPath.includes('/signup.html') &&
        !currentPath.includes('/employer-login.html') &&
        !currentPath.includes('/employer-signup.html') &&
        !currentPath.includes('/forgot-password.html') &&
        !currentPath.includes('/reset-password.html') &&
        !currentPath.includes('/index.html')
      ) {
        console.log('Token invalid, redirecting to login');
        window.location.href = '/login.html';
      }
    }
  }

  /**
   * Expose token utilities globally
   */
  window.JobAssistTokenManager = {
    isTokenExpired,
    getTimeUntilExpiry,
    refreshAccessToken,
    clearTokens,
    getValidAccessToken,
    setupAutoRefresh,
    redirectToLoginIfNeeded
  };

  // Auto-setup on page load if API integration is available
  document.addEventListener('DOMContentLoaded', () => {
    if (window.JobAssistAPI) {
      setupAutoRefresh();
      redirectToLoginIfNeeded();
    }
  });

  console.log('JobAssist Token Manager loaded');
})();
