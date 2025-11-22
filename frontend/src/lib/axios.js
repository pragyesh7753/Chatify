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

// Add response interceptor for better error handling
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

    // Handle token refresh on 401 errors
    if (error.response?.status === 401 && 
        error.response?.data?.needsRefresh && 
        !originalRequest._retry) {
      
      originalRequest._retry = true;

      try {
        console.log('Access token expired, attempting to refresh...');
        await axiosInstance.post('/auth/refresh-token');
        console.log('Token refreshed successfully, retrying original request');
        
        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Refresh failed, user needs to login again
        // Clear any auth state and redirect to login
        localStorage.removeItem('chatify-user');
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);