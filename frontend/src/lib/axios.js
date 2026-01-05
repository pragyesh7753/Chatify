import axios from "axios";

const BASE_URL = import.meta.env.MODE === "development"
  ? "http://localhost:5000/api"
  : "https://backend.chatify.studio/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track token refresh state
let isRefreshing = false;
let refreshPromise = null;

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
    const excludedEndpoints = ['/auth/refresh-token', '/auth/login', '/auth/signup', '/auth/verify-email', '/auth/resend-verification'];
    const isExcluded = originalRequest?.url && excludedEndpoints.some(endpoint => originalRequest.url.includes(endpoint));
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !isExcluded && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing && refreshPromise) {
        // Wait for ongoing refresh to complete
        try {
          await refreshPromise;
          return axiosInstance(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      isRefreshing = true;
      refreshPromise = axios.post(
        `${BASE_URL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      ).then(response => {
        console.log('Token refreshed successfully');
        isRefreshing = false;
        refreshPromise = null;
        return response;
      }).catch(refreshError => {
        console.error('Token refresh failed:', refreshError);
        isRefreshing = false;
        refreshPromise = null;
        
        const currentPath = window.location.pathname;
        const isOnAuthPage = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/verify-email-change'].some(path => currentPath.includes(path));
        
        if (!isOnAuthPage) {
          localStorage.removeItem('chatify-user');
          window.location.href = '/login';
        }
        
        throw refreshError;
      });

      try {
        await refreshPromise;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);