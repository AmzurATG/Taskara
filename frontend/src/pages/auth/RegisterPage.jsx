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
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  PersonAdd,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { registerUser, clearError } from '../../store/slices/authSlice.js';

// Validation schema
const registerSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .required('Name is required'),
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

// Password strength calculator
const getPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 6) strength += 25;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return Math.min(strength, 100);
};

const getStrengthColor = (strength) => {
  if (strength < 25) return '#ef4444';
  if (strength < 50) return '#f59e0b';
  if (strength < 75) return '#3b82f6';
  return '#10b981';
};

const getStrengthText = (strength) => {
  if (strength < 25) return 'Weak';
  if (strength < 50) return 'Fair';
  if (strength < 75) return 'Good';
  return 'Strong';
};

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password', '');
  const passwordStrength = getPasswordStrength(watchedPassword);

  const onSubmit = async (data) => {
    try {
      dispatch(clearError());
      const result = await dispatch(registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      })).unwrap();
      toast.success(`Welcome to Taskara, ${result.user.name}!`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error || 'Registration failed');
    }
  };

  // Clear error when component mounts or when switching pages
  React.useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        maxHeight: '100vh',
        overflow: 'auto',
        background: 'linear-gradient(135deg, #181824 0%, #232136 50%, #1e1b2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 1,
        paddingTop: 3, // Add more top padding to prevent browser merging
      }}
    >
      <Container maxWidth="xs" sx={{ py: 2 }}>
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
              marginTop: 2, // Additional margin from top
            }}
          >
            <CardContent sx={{ p: 3, pt: 4 }}> {/* More top padding inside card */}
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 2.5 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
                >
                  <Avatar
                    sx={{
                      width: 50,
                      height: 50,
                      mx: 'auto',
                      mb: 1.5,
                      background: 'linear-gradient(45deg, #a259ff, #c084fc)',
                      fontSize: '1.2rem',
                    }}
                  >
                    <PersonAdd fontSize="medium" />
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
                    mb: 0.5,
                  }}
                >
                  Join Taskara
                </Typography>
                
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5, fontSize: '0.875rem' }}
                >
                  Create your account to get started
                </Typography>
                
                <Typography
                  variant="body2"
                  color="text.muted"
                  sx={{ fontSize: '0.75rem' }}
                >
                  Transform your productivity with AI-powered task management
                </Typography>
              </Box>

              {/* Error Alert */}
              <Fade in={!!error}>
                <Box sx={{ mb: 2 }}>
                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#fecaca',
                        fontSize: '0.875rem',
                        py: 1,
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                </Box>
              </Fade>

              {/* Register Form */}
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={3}>
                  <TextField
                    {...register('name')}
                    label="Full Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: 'text.secondary' }} />
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
                    }}
                  />

                  <TextField
                    {...register('email')}
                    label="Email Address"
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary' }} />
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
                    }}
                  />

                  <Box>
                    <TextField
                      {...register('password')}
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={togglePasswordVisibility}
                              edge="end"
                              sx={{ color: 'text.secondary' }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    
                    {/* Password Strength Indicator */}
                    {watchedPassword && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Password strength:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: getStrengthColor(passwordStrength),
                              fontWeight: 600,
                            }}
                          >
                            {getStrengthText(passwordStrength)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={passwordStrength}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getStrengthColor(passwordStrength),
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Box>
                    )}
                  </Box>

                  <TextField
                    {...register('confirmPassword')}
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    fullWidth
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={toggleConfirmPasswordVisibility}
                            edge="end"
                            sx={{ color: 'text.secondary' }}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    startIcon={isLoading ? null : <PersonAdd />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(45deg, #a259ff, #c084fc)',
                      boxShadow: '0 4px 20px rgba(162, 89, 255, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #9333ea, #a259ff)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(162, 89, 255, 0.4)',
                      },
                      '&:disabled': {
                        background: 'rgba(162, 89, 255, 0.3)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      },
                    }}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </Stack>
              </Box>

              {/* Divider */}
              <Box sx={{ my: 4 }}>
                <Divider sx={{ borderColor: 'rgba(162, 89, 255, 0.2)' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                    Already have an account?
                  </Typography>
                </Divider>
              </Box>

              {/* Login Link */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Ready to sign in?{' '}
                  <Link
                    component={RouterLink}
                    to="/login"
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
                    Sign in here
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.muted" sx={{ fontSize: '0.875rem' }}>
            © 2025 Taskara. Built with passion for productivity.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default RegisterPage;