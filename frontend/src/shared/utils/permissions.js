// Helper functions for handling browser permissions

export const checkPermission = async (permissionName) => {
  try {
    if (!navigator.permissions) {
      return { state: 'prompt', error: 'Permissions API not supported' };
    }
    
    const result = await navigator.permissions.query({ name: permissionName });
    return { state: result.state, error: null };
  } catch (error) {
    console.error(`Error checking ${permissionName} permission:`, error);
    return { state: 'prompt', error: error.message };
  }
};

export const checkMediaPermissions = async () => {
  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        camera: 'unsupported',
        microphone: 'unsupported',
        error: 'Media devices not supported in this browser'
      };
    }

    // Try to get the current permission state
    const cameraPermission = await checkPermission('camera').catch(() => ({ state: 'prompt' }));
    const microphonePermission = await checkPermission('microphone').catch(() => ({ state: 'prompt' }));

    return {
      camera: cameraPermission.state,
      microphone: microphonePermission.state,
      error: null
    };
  } catch (error) {
    console.error('Error checking media permissions:', error);
    return {
      camera: 'prompt',
      microphone: 'prompt',
      error: error.message
    };
  }
};

export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    return { state: 'unsupported', error: 'Notifications not supported in this browser' };
  }
  
  return { state: Notification.permission, error: null };
};

export const getPermissionInstructions = (permissionType, browser = null) => {
  const detectedBrowser = browser || detectBrowser();
  
  const instructions = {
    camera: {
      chrome: [
        "Click the lock icon in the address bar",
        "Find 'Camera' and set it to 'Allow'",
        "Refresh the page"
      ],
      firefox: [
        "Click the lock icon in the address bar",
        "Click 'Connection secure' → 'More Information'",
        "Go to 'Permissions' tab and allow Camera",
        "Refresh the page"
      ],
      safari: [
        "Go to Safari → Settings → Websites",
        "Click 'Camera' in the left sidebar",
        "Allow this website to access your camera",
        "Refresh the page"
      ],
      edge: [
        "Click the lock icon in the address bar",
        "Find 'Camera' and set it to 'Allow'",
        "Refresh the page"
      ],
      default: [
        "Click the permission icon in your browser's address bar",
        "Allow camera access for this website",
        "Refresh the page"
      ]
    },
    microphone: {
      chrome: [
        "Click the lock icon in the address bar",
        "Find 'Microphone' and set it to 'Allow'",
        "Refresh the page"
      ],
      firefox: [
        "Click the lock icon in the address bar",
        "Click 'Connection secure' → 'More Information'",
        "Go to 'Permissions' tab and allow Microphone",
        "Refresh the page"
      ],
      safari: [
        "Go to Safari → Settings → Websites",
        "Click 'Microphone' in the left sidebar",
        "Allow this website to access your microphone",
        "Refresh the page"
      ],
      edge: [
        "Click the lock icon in the address bar",
        "Find 'Microphone' and set it to 'Allow'",
        "Refresh the page"
      ],
      default: [
        "Click the permission icon in your browser's address bar",
        "Allow microphone access for this website",
        "Refresh the page"
      ]
    },
    notification: {
      chrome: [
        "Click the lock icon in the address bar",
        "Find 'Notifications' and set it to 'Allow'",
        "Refresh the page"
      ],
      firefox: [
        "Click the lock icon in the address bar",
        "Click 'Connection secure' → 'More Information'",
        "Go to 'Permissions' tab and allow Notifications",
        "Refresh the page"
      ],
      safari: [
        "Go to Safari → Settings → Websites",
        "Click 'Notifications' in the left sidebar",
        "Allow this website to send notifications",
        "Refresh the page"
      ],
      edge: [
        "Click the lock icon in the address bar",
        "Find 'Notifications' and set it to 'Allow'",
        "Refresh the page"
      ],
      default: [
        "Click the permission icon in your browser's address bar",
        "Allow notifications for this website",
        "Refresh the page"
      ]
    }
  };

  return instructions[permissionType]?.[detectedBrowser] || instructions[permissionType]?.default || [];
};

export const detectBrowser = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('edg/')) return 'edge';
  if (userAgent.includes('chrome') && !userAgent.includes('edg/')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
  
  return 'default';
};

export const handleMediaPermissionError = (error) => {
  const errorName = error.name || '';
  const errorMessage = error.message || '';

  // NotAllowedError or PermissionDeniedError - user denied permission
  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return {
      type: 'permission_denied',
      title: 'Camera/Microphone Access Denied',
      message: 'You need to grant camera and microphone access to make video calls.',
      canRetry: true
    };
  }

  // NotFoundError - no camera/microphone found
  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return {
      type: 'device_not_found',
      title: 'No Camera or Microphone Found',
      message: 'Please connect a camera and microphone to make video calls.',
      canRetry: false
    };
  }

  // NotReadableError - device is already in use
  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return {
      type: 'device_busy',
      title: 'Camera/Microphone is Busy',
      message: 'Your camera or microphone is being used by another application. Please close it and try again.',
      canRetry: true
    };
  }

  // OverconstrainedError - constraints can't be satisfied
  if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
    return {
      type: 'constraints_error',
      title: 'Camera/Microphone Settings Error',
      message: 'Your device doesn\'t meet the required camera/microphone specifications.',
      canRetry: false
    };
  }

  // SecurityError - page is not served over HTTPS or other security issue
  if (errorName === 'SecurityError') {
    return {
      type: 'security_error',
      title: 'Security Error',
      message: 'Camera and microphone access requires a secure connection (HTTPS).',
      canRetry: false
    };
  }

  // Generic error
  return {
    type: 'unknown_error',
    title: 'Media Access Error',
    message: errorMessage || 'An unexpected error occurred while accessing your camera or microphone.',
    canRetry: true
  };
};
