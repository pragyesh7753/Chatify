import { useState, useEffect } from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '../store/useThemeStore';

const PWAUpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed, update available');
              setUpdateAvailable(true);
            }
          });
        });

        // Check if there's already a waiting worker
        if (reg.waiting) {
          console.log('Service worker already waiting, update available');
          setUpdateAvailable(true);
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          console.log('Received UPDATE_AVAILABLE message');
          setUpdateAvailable(true);
        }
      });

      // Listen for controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed, reloading page');
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = async () => {
    console.log('Update button clicked');
    setIsUpdating(true);
    
    try {
      if (registration && registration.waiting) {
        console.log('Posting SKIP_WAITING message to service worker');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait a bit for the service worker to take control
        setTimeout(() => {
          console.log('Reloading page after update');
          window.location.reload();
        }, 500);
      } else {
        console.log('No waiting service worker found, forcing page reload');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error during update:', error);
      setIsUpdating(false);
      // Fallback: force reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    console.log('Update notification dismissed');
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50" data-theme={theme}>
      <div className="bg-info/10 border border-info/20 rounded-lg p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-info mb-1">
              Update Available
            </h3>
            <p className="text-xs text-info/80 mb-3">
              A new version of Chatify is available. Update now to get the latest features and improvements.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 text-info/60 hover:text-info transition-colors"
            disabled={isUpdating}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 btn btn-info btn-sm text-xs flex items-center justify-center gap-1"
          >
            {isUpdating ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Updating...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-3 w-3" />
                Update Now
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isUpdating}
            className="btn btn-ghost btn-sm text-xs text-info/80 hover:text-info disabled:opacity-50"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;
