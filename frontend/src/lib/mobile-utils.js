// Mobile utility functions
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const debugDeviceInfo = () => {
  const info = {
    userAgent: navigator.userAgent,
    isMobile: isMobile(),
    isIOS: isIOS(),
    isSafari: isSafari(),
    cookiesEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    platform: navigator.platform,
    language: navigator.language,
    screen: {
      width: screen.width,
      height: screen.height,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  };
  
  console.log('Device Info:', info);
  return info;
};

export const testCookieSupport = () => {
  try {
    // Test if we can set a cookie
    document.cookie = "test=1; SameSite=None; Secure";
    const cookieSet = document.cookie.indexOf("test=1") !== -1;
    
    // Clean up test cookie
    document.cookie = "test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure";
    
    return cookieSet;
  } catch (error) {
    console.error('Cookie test failed:', error);
    return false;
  }
};
