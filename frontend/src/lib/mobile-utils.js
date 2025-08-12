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
    // Test basic cookie support
    document.cookie = "test=1; path=/";
    const basicCookieSet = document.cookie.indexOf("test=1") !== -1;
    
    // Test SameSite=None cookie support (for HTTPS only)
    if (window.location.protocol === 'https:') {
      document.cookie = "testSecure=1; SameSite=None; Secure; path=/";
      const secureCookieSet = document.cookie.indexOf("testSecure=1") !== -1;
      
      // Clean up test cookies
      document.cookie = "test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      document.cookie = "testSecure=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; path=/";
      
      return { basic: basicCookieSet, secure: secureCookieSet };
    } else {
      // Clean up test cookie
      document.cookie = "test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      return { basic: basicCookieSet, secure: false };
    }
  } catch (error) {
    console.error('Cookie test failed:', error);
    return { basic: false, secure: false };
  }
};

export const getAllCookies = () => {
  const cookies = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
};
