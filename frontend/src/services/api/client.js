import axios from 'axios';
import { toast } from 'react-hot-toast';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Check if token is expired before using it
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp && payload.exp < currentTime) {
          // Token is expired, remove it and don't add to request
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // If token is invalid, remove it
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Only clear token and redirect if this is not an initial auth check
      const isInitialAuthCheck = error.config.url.includes('/api/auth/me');
      
      if (!isInitialAuthCheck) {
        // Clear token and redirect to login for authentication/authorization errors
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        
        // Show user-friendly message and redirect
        const errorMessage = error.response?.status === 401 
          ? 'Your session has expired. Please log in again.' 
          : 'Access denied. Please log in with proper credentials.';
          
        console.log(`Authentication error (${error.response.status}): ${errorMessage}`);
        
        // Show user-friendly toast message
        toast.error(errorMessage);
        
        // Add a small delay to allow message to be seen before redirect
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;