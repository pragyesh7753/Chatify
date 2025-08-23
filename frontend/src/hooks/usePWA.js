import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if app is installed
    const checkInstallStatus = () => {
      const isStandalone = window.navigator.standalone || 
                          window.matchMedia('(display-mode: standalone)').matches ||
                          window.matchMedia('(display-mode: fullscreen)').matches;
      setIsInstalled(isStandalone);
    };

    checkInstallStatus();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const getInstallPrompt = () => {
    return new Promise((resolve) => {
      const handler = (e) => {
        e.preventDefault();
        resolve(e);
        window.removeEventListener('beforeinstallprompt', handler);
      };
      window.addEventListener('beforeinstallprompt', handler);
    });
  };

  return {
    isInstalled,
    isOnline,
    getInstallPrompt
  };
};

export default usePWA;
