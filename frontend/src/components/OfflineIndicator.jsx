import { useState, useEffect } from 'react';
import { WifiIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import usePWA from '../hooks/usePWA';

const ConnectionStatus = () => {
  const { isOnline } = usePWA();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBackOnline(false);
      // Show offline toast
      toast.error('Connection lost - You\'re offline', {
        id: 'offline-status',
        duration: Infinity,
        icon: '📵',
      });
    } else if (isOnline && wasOffline) {
      // Dismiss offline toast
      toast.dismiss('offline-status');
      
      // Show "Back Online" notification
      setShowBackOnline(true);
      setWasOffline(false);
      
      // Show back online toast
      toast.success('Back online!', {
        id: 'online-status',
        duration: 3000,
        icon: '🌐',
      });
      
      // Hide the banner after 3 seconds
      const timer = setTimeout(() => {
        setShowBackOnline(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Show offline indicator
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-warning text-warning-content text-center py-3 px-4 z-50 shadow-lg transition-all duration-300 transform translate-y-0">
        <div className="flex items-center justify-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">You're offline</span>
          <WifiIcon className="h-4 w-4 opacity-60" />
        </div>
      </div>
    );
  }

  // Show back online notification
  if (showBackOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-success text-success-content text-center py-3 px-4 z-50 shadow-lg transition-all duration-300 transform translate-y-0">
        <div className="flex items-center justify-center gap-2">
          <CheckCircleIcon className="h-4 w-4 animate-bounce" />
          <span className="text-sm font-medium">Back online!</span>
          <WifiIcon className="h-4 w-4 animate-pulse" />
        </div>
      </div>
    );
  }

  return null;
};

export default ConnectionStatus;
