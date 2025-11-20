import { useEffect } from 'react';

/**
 * Custom hook - DEPRECATED
 * Keep-alive pinging is now handled by external monitoring service
 * Backend /api/ping endpoint is available at:
 * - Local: http://localhost:5000/api/ping
 * - Production: https://hindustanmarbleandtiles-backend.onrender.com/api/ping
 */
export const useKeepAlive = () => {
  useEffect(() => {
    // Keep-alive is disabled - use external monitor instead
    console.log('ℹ️ Keep-alive hook is deprecated. Use external monitoring service for /api/ping');
  }, []);
};