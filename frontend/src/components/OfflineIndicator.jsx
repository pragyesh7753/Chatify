import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import usePWA from '../hooks/usePWA';

const OfflineIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 px-4 z-50">
      <div className="flex items-center justify-center gap-2">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span className="text-sm font-medium">You're offline</span>
        <WifiIcon className="h-4 w-4 opacity-50" />
      </div>
    </div>
  );
};

export default OfflineIndicator;
