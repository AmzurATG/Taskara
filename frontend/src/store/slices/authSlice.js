import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api/auth.js';

// Async thunks for authentication actions
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (!token) {
        // No token means user is not authenticated
        localStorage.removeItem('user');
        return null;
      }

      // First check if token is expired using client-side check
      if (!authAPI.isAuthenticated()) {
        // Token is expired or invalid, clear storage
        console.warn('Token expired or invalid - clearing stored data');
        return null;
      }

      // If we have both token and user data, and token is not expired,
      // we can trust the stored data initially
      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Optionally verify with server in background (don't block UI)
          authAPI.getCurrentUser().catch(error => {
            // If server check fails, we'll handle it on next navigation
            console.warn('Background server auth check failed:', error);
          });
          
          return {
            user: user,
            token: token
          };
        } catch (error) {
          // If stored user data is corrupted, try server verification
          console.warn('Stored user data corrupted, checking with server');
        }
      }
      
      try {
        // Only do server verification if we don't have valid stored data
        const serverUser = await authAPI.getCurrentUser();
        return {
          user: serverUser,
          token: token
        };
      } catch (error) {
        // Only clear data if server specifically returns 401 (unauthorized)
        if (error.response && error.response.status === 401) {
          console.warn('Server returned 401 - token invalid, clearing stored data');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          return null;
        }
        
        // For other errors (network, server down, etc.), keep existing auth state
        // if we have valid stored data
        if (token && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            console.warn('Server verification failed but token not expired, keeping auth state');
            return {
              user: user,
              token: token
            };
          } catch (parseError) {
            // If we can't parse stored user, clear everything
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            return null;
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only clear storage if we're sure the token is invalid
      return null;
    }
  }
);

// Get initial state from localStorage to prevent redirect flicker
const getInitialState = () => {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      // Check if token is expired before setting initial state
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return {
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        };
      }

      const user = JSON.parse(userStr);
      return {
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    } catch (error) {
      // If stored data is invalid, clean it up
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }
  
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
};

// Initial state
const initialState = getInitialState();

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      authAPI.logout();
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      })
      
      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      })
      
      // Get current user cases
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Check auth status cases
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      });
  },
});

export const { clearError, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;