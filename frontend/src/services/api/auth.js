import apiClient from './client.js';

// Authentication API service based on the Postman collection
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await apiClient.post('/api/auth/register', {
        name: userData.name,
        email: userData.email,
        password: userData.password,
      });
      
      // Store token and user data
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        'Registration failed'
      );
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });
      
      // Store token and user data
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        'Login failed'
      );
    }
  },

  // Get current user information
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        'Failed to get user information'
      );
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    try {
      // Check if token is expired (JWT tokens have exp claim)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired, remove it
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return false;
      }
      
      return true;
    } catch (error) {
      // If token is invalid, remove it
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return false;
    }
  },

  // Get stored user data
  getStoredUser: () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  // Refresh token (if needed in the future)
  refreshToken: async () => {
    try {
      // This endpoint might not exist yet, but prepared for future use
      const response = await apiClient.post('/api/auth/refresh');
      
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
      }
      
      return response.data;
    } catch (error) {
      // If refresh fails, logout user
      authAPI.logout();
      throw new Error('Session expired. Please login again.');
    }
  },
};

export default authAPI;