import axios from "axios";

const BASE_URL = import.meta.env.MODE === "development"
  ? "http://localhost:5000/api"
  : "https://chatify-production-001a.up.railway.app/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track token refresh state
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url, 'with method:', config.method);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling and token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error('Response error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });

    // Don't attempt refresh for these specific endpoints
    const excludedEndpoints = ['/auth/refresh-token', '/auth/login', '/auth/signup', '/auth/verify-email', '/auth/resend-verification', '/auth/me'];
    const isExcluded = excludedEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));
    
    // Handle 401 errors with token refresh (but not for excluded endpoints or auth check)
    if (error.response?.status === 401 && !isExcluded && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('Access token expired, attempting to refresh...');
        const refreshResponse = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        console.log('Token refreshed successfully:', refreshResponse.data);
        
        // Process all queued requests
        processQueue(null);
        
        isRefreshing = false;
        
        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        console.error('Token refresh failed:', refreshError);
        
        // Process queue with error
        processQueue(refreshError, null);
        
        // Only redirect to login if refresh fails and not already on auth pages
        const currentPath = window.location.pathname;
        const isOnAuthPage = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/verify-email-change'].some(path => currentPath.includes(path));
        
        if (!isOnAuthPage) {
          // Clear auth state silently without redirecting immediately
          // Let the auth check handle the redirect naturally
          localStorage.removeItem('chatify-user');
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);