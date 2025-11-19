import { useEffect } from 'react';

/**
 * Custom hook to keep the backend server alive on Render free tier
 * Pings the backend health endpoint every 12 minutes to prevent hibernation
 */
export const useKeepAlive = () => {
  useEffect(() => {
    const KEEP_ALIVE_INTERVAL = 12 * 60 * 1000; // 12 minutes (Render hibernates after 15 min of inactivity)
    const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const pingBackend = async () => {
      try {
        await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          credentials: 'include'
        });
        console.log(`[${new Date().toISOString()}] Keep-alive ping sent to backend`);
      } catch (error) {
        console.log(`Keep-alive ping failed: ${error.message}`);
        // Silent fail - don't disrupt user experience if ping fails
      }
    };

    // Send initial ping after 1 minute
    const initialTimeout = setTimeout(pingBackend, 60000);

    // Set up interval for subsequent pings
    const interval = setInterval(pingBackend, KEEP_ALIVE_INTERVAL);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);
};
