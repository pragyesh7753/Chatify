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

    // Enhanced online/offline detection
    const handleOnline = () => {
      console.log('🌐 Connection restored');
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log('📵 Connection lost');
      setIsOnline(false);
    };

    // Listen for network events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Additional check with network information API if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const updateConnectionStatus = () => {
        setIsOnline(navigator.onLine && connection.effectiveType !== 'slow-2g');
      };
      
      connection.addEventListener('change', updateConnectionStatus);
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      console.log('📱 App installed successfully');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', () => {});
      }
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
