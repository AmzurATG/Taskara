import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

// Import pages and components
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import ProjectsPage from './pages/projects/ProjectsPage.jsx';
import ProjectDetailPage from './pages/projects/ProjectDetailPage.jsx';
import EpicDetailPage from './pages/projects/EpicDetailPage.jsx';
import StoryDetailPage from './pages/projects/StoryDetailPage.jsx';
import TaskDetailPage from './pages/projects/TaskDetailPage.jsx';
import SubTaskDetailPage from './pages/projects/SubTaskDetailPage.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';

// Import context providers
import { ProjectHierarchyProvider } from './contexts/ProjectHierarchyContext.jsx';

// Import store actions
import { checkAuthStatus } from './store/slices/authSlice.js';
import { migrateUIState } from './store/slices/uiSlice.js';
import { authAPI } from './services/api/auth.js';

const App = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);

  useEffect(() => {
    // Migrate UI state to handle any breaking changes in viewPreferences
    dispatch(migrateUIState());
    
    // Check if user is already authenticated on app load
    dispatch(checkAuthStatus()).finally(() => {
      setAuthCheckCompleted(true);
    });
  }, [dispatch]);

  // Redirect to login if not authenticated after auth check is complete
  useEffect(() => {
    if (authCheckCompleted && !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
      // Double-check with client-side token validation before redirecting
      const token = localStorage.getItem('access_token');
      if (!token || !authAPI.isAuthenticated()) {
        console.log('No valid token found, redirecting to login');
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, authCheckCompleted, navigate, location.pathname]);

  // Show loading spinner during initial auth check
  if (!authCheckCompleted || isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <LoadingSpinner size={60} />
      </Box>
    );
  }

  return (
    <ProjectHierarchyProvider>
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <AnimatePresence mode="wait">
          <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : 
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <LoginPage />
              </motion.div>
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : 
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RegisterPage />
              </motion.div>
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DashboardPage />
                </motion.div>
              </ProtectedRoute>
            } 
          />

          {/* Projects Routes */}
          <Route 
            path="/projects" 
            element={
              <ProtectedRoute>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProjectsPage />
                </motion.div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId" 
            element={
              <ProtectedRoute>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProjectDetailPage />
                </motion.div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId/epics/:epicId" 
            element={
              <ProtectedRoute>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <EpicDetailPage />
                </motion.div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId/epics/:epicId/stories/:storyId" 
            element={
              <ProtectedRoute>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <StoryDetailPage />
                </motion.div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId/epics/:epicId/stories/:storyId/tasks/:taskId" 
            element={
              <ProtectedRoute>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TaskDetailPage />
                </motion.div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId/epics/:epicId/stories/:storyId/tasks/:taskId/subtasks/:subtaskId" 
            element={
              <ProtectedRoute>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SubTaskDetailPage />
                </motion.div>
              </ProtectedRoute>
            } 
          />

          {/* Root redirect */}
          <Route 
            path="/" 
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
            } 
          />

          {/* Catch all route */}
          <Route 
            path="*" 
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
            } 
          />
        </Routes>
      </AnimatePresence>
    </Box>
    </ProjectHierarchyProvider>
  );
};

export default App;