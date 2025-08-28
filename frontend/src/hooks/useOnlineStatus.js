import { useEffect } from 'react';
import { updateOnlineStatus, setUserOffline } from '../lib/api';

export const useOnlineStatus = (isAuthenticated = false) => {
  useEffect(() => {
    // Only run if user is authenticated
    if (!isAuthenticated) return;

    const setOnline = async () => {
      try {
        await updateOnlineStatus(true);
      } catch (error) {
        console.error('Failed to set online status:', error);
      }
    };

    const setOffline = async () => {
      try {
        await setUserOffline();
      } catch (error) {
        console.error('Failed to set offline status:', error);
      }
    };

    // Set user as online when component mounts
    setOnline();

    // Periodic online status update (every 2 minutes)
    const statusInterval = setInterval(() => {
      if (!document.hidden) {
        setOnline();
      }
    }, 2 * 60 * 1000); // 2 minutes

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    // Handle beforeunload (when user closes/refreshes page)
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for more reliable delivery
      if (navigator.sendBeacon) {
        const formData = new FormData();
        formData.append('isOnline', 'false');
        navigator.sendBeacon('/api/users/offline', formData);
      } else {
        setOffline();
      }
    };

    // Handle window focus/blur
    const handleFocus = () => setOnline();
    const handleBlur = () => setOffline();

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      clearInterval(statusInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      // Set offline when component unmounts
      setOffline();
    };
  }, [isAuthenticated]);
};
