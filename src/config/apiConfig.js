/**
 * Centralized API Configuration
 * Single source of truth for all API-related settings
 * 
 * Change VITE_API_URL in .env and it affects ALL API calls automatically
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_ENDPOINT = `${API_BASE_URL}/api`;

/**
 * API Configuration object
 * Contains all settings needed for API communication
 */
export const apiConfig = {
  // Base URLs
  API_BASE_URL,
  API_ENDPOINT,

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    STANDARD: 60000, // 60 seconds - for Render cold starts
    UPLOAD: 120000, // 120 seconds - for file uploads
    SHORT: 30000, // 30 seconds - for quick requests
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000, // 1 second
    MAX_DELAY: 10000, // 10 seconds
    MULTIPLIER: 2, // exponential backoff
  },

  // Request configuration
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // Enable/Disable features
  FEATURES: {
    RETRY_ON_FAILURE: true,
    LOG_REQUESTS: true,
    LOG_RESPONSES: true,
  },
};

/**
 * Log helper for debugging
 */
export const apiLogger = {
  log: (message, data = null) => {
    if (apiConfig.FEATURES.LOG_REQUESTS) {
      console.log(`[API] ${message}`, data || '');
    }
  },
  error: (message, error = null) => {
    console.error(`[API ERROR] ${message}`, error || '');
  },
  warn: (message, data = null) => {
    console.warn(`[API WARN] ${message}`, data || '');
  },
};

/**
 * Get API endpoint for a specific route
 * @param {string} path - API path (e.g., '/products', '/invoices')
 * @returns {string} Full API URL
 */
export const getApiUrl = (path) => {
  return `${API_ENDPOINT}${path.startsWith('/') ? path : '/' + path}`;
};

/**
 * Exponential backoff retry helper
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum attempts
 * @returns {Promise} Result from function
 */
export const retryWithBackoff = async (fn, maxAttempts = apiConfig.RETRY.MAX_ATTEMPTS) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = Math.min(
          apiConfig.RETRY.INITIAL_DELAY * Math.pow(apiConfig.RETRY.MULTIPLIER, attempt - 1),
          apiConfig.RETRY.MAX_DELAY
        );

        apiLogger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

export default apiConfig;
