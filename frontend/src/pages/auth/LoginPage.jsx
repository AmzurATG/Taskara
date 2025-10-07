import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Link,
  InputAdornment,
  IconButton,
  Alert,
  Fade,
  Avatar,
  Divider,
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Login as LoginIcon,
  Person,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { loginUser, clearError } from '../../store/slices/authSlice.js';

// Validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  // Debug: Log error state changes
  React.useEffect(() => {
    console.log('LoginPage - Error state changed:', error);
  }, [error]);

  // Auto-dismiss error after 4 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Don't clear error on mount - let it persist until user action

  // Clear error when user starts typing
  const handleInputChange = () => {
    if (error) {
      dispatch(clearError());
    }
  };

  const onSubmit = async (data) => {
    console.log('Login form submitted with:', data);
    try {
      const result = await dispatch(loginUser(data)).unwrap();
      console.log('Login successful:', result);
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate('/dashboard');
    } catch (error) {
      // Error is automatically set in Redux state by the rejected action
      console.error('Login error caught:', error);
      console.log('Redux error state should now be:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #181824 0%, #232136 50%, #1e1b2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 1,
        paddingTop: 2, // Add top padding to prevent browser merging
      }}
    >
      <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ width: '100%' }}
        >
          <Card
            elevation={0}
            sx={{
              background: 'rgba(35, 33, 54, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(162, 89, 255, 0.2)',
              borderRadius: 2,
              overflow: 'hidden',
              maxHeight: '90vh',
              overflowY: 'auto',
              marginTop: 1, // Additional margin from top
            }}
          >
            <CardContent sx={{ p: 3, pt: 4 }}> {/* More top padding inside card */}
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
                >
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      mx: 'auto',
                      mb: 2,
                      background: 'linear-gradient(45deg, #a259ff, #c084fc)',
                      fontSize: '1.5rem',
                    }}
                  >
                    <LoginIcon fontSize="medium" />
                  </Avatar>
                </motion.div>
                
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    background: 'linear-gradient(45deg, #a259ff, #c084fc)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                  }}
                >
                  Welcome Back
                </Typography>
                
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}
                >
                  Sign in to your Taskara account
                </Typography>
                
                <Typography
                  variant="body2"
                  color="text.muted"
                  sx={{ fontSize: '0.75rem' }}
                >
                  Manage your projects with AI-powered efficiency
                </Typography>
              </Box>

              {/* Error Alert - Make sure it's always visible when error exists */}
              {error && (
                <Box sx={{ mb: 2 }}>
                  <Alert 
                    severity="error" 
                    sx={{ 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fecaca',
                      fontSize: '0.875rem',
                      py: 1,
                      '& .MuiAlert-message': {
                        width: '100%',
                      },
                    }}
                  >
                    {error}
                  </Alert>
                </Box>
              )}

              {/* Login Form */}
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2.5}>
                  <TextField
                    {...register('email')}
                    label="Email Address"
                    type="email"
                    fullWidth
                    size="medium"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    onChange={(e) => {
                      register('email').onChange(e);
                      handleInputChange();
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover': {
                          '& > fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.9rem',
                      },
                    }}
                  />

                  <TextField
                    {...register('password')}
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    size="medium"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    onChange={(e) => {
                      register('password').onChange(e);
                      handleInputChange();
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={togglePasswordVisibility}
                            edge="end"
                            sx={{ color: 'text.secondary' }}
                            size="small"
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: '0.9rem',
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    startIcon={isLoading ? null : <LoginIcon />}
                    sx={{
                      py: 1.2,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      background: 'linear-gradient(45deg, #a259ff, #c084fc)',
                      boxShadow: '0 4px 20px rgba(162, 89, 255, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #9333ea, #a259ff)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 25px rgba(162, 89, 255, 0.4)',
                      },
                      '&:disabled': {
                        background: 'rgba(162, 89, 255, 0.3)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      },
                    }}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </Stack>
              </Box>

              {/* Divider */}
              <Box sx={{ my: 3 }}>
                <Divider sx={{ borderColor: 'rgba(162, 89, 255, 0.2)' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2, fontSize: '0.75rem' }}>
                    New to Taskara?
                  </Typography>
                </Divider>
              </Box>

              {/* Register Link */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Don't have an account?{' '}
                  <Link
                    component={RouterLink}
                    to="/register"
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        textDecoration: 'underline',
                        color: 'primary.light',
                      },
                    }}
                  >
                    Create one now
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
};

export default LoginPage;