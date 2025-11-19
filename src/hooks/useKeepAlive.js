import { useEffect } from 'react';
import axios from 'axios';

export const useKeepAlive = () => {
  useEffect(() => {
    // Ping backend every 14 minutes to keep it awake
    const pingBackend = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/ping`);
        console.log('✅ Backend ping successful:', response.data);
      } catch (err) {
        console.error('❌ Backend ping failed:', err.message);
      }
    };

    // First ping after 5 seconds
    const initialTimeout = setTimeout(pingBackend, 5000);

    // Then ping every 14 minutes (840000 ms)
    const interval = setInterval(pingBackend, 14 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);
};