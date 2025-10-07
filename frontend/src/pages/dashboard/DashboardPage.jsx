import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Grid,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ExitToApp,
  Settings,
  Person,
  Notifications,
  Add,
  TrendingUp,
  Assignment,
  People,
  MoreVert,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { logout } from '../../store/slices/authSlice.js';
import { projectsAPI } from '../../services/api/projects.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import ThemeToggleMenuItem from '../../components/common/ThemeToggleMenuItem.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import CreateProjectModal from '../../components/projects/CreateProjectModal.jsx';
import FilteredProjectsView from '../../components/projects/FilteredProjectsView.jsx';

const DashboardPage = () => {
  const { user } = useSelector((state) => state.auth);

  // Route to appropriate dashboard based on user role
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Regular user dashboard (existing code)
  return <UserDashboard />;
};

const UserDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { themeMode, toggleTheme, isDark } = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [projectStats, setProjectStats] = useState({ total: 0, active: 0, completed: 0 });
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [filteredProjectsView, setFilteredProjectsView] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleMenuClose();
  };

  const handleCardClick = (cardTitle) => {
    switch (cardTitle) {
      case 'Total Projects':
        setFilteredProjectsView('all');
        break;
      case 'Active Projects':
        navigate('/projects');
        break;
      case 'Team Members':
        // Navigate to team when implemented
        break;
      case 'Completed':
        // Navigate to completed items when implemented
        break;
      default:
        break;
    }
  };

  const handleCreateProject = () => {
    setCreateProjectModalOpen(true);
  };

  const handleCloseCreateProjectModal = () => {
    setCreateProjectModalOpen(false);
    // Refresh project stats when modal closes (in case a project was created)
    loadProjectStats();
  };

  const loadProjectStats = async () => {
    try {
      // Get all projects including inactive ones for total count
      const allProjects = await projectsAPI.getAllProjects(true);
      setProjectStats({
        total: allProjects.length,
        active: allProjects.filter(p => p.active).length,
        completed: allProjects.filter(p => !p.active).length, // inactive projects are "completed" in this context
      });
    } catch (error) {
      console.error('Failed to load project stats:', error);
    }
  };

  useEffect(() => {
    loadProjectStats();
  }, []);

  const statsCards = [
    {
      title: 'Total Projects',
      value: projectStats.total.toString(),
      icon: Assignment,
      color: '#a259ff',
      bgColor: 'rgba(162, 89, 255, 0.1)',
      clickable: true,
    },
    {
      title: 'Active Projects',
      value: projectStats.active.toString(),
      icon: TrendingUp,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      clickable: true,
    },
    {
      title: 'Team Members',
      value: '1',
      icon: People,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      clickable: false,
    },
    {
      title: 'Completed',
      value: projectStats.completed.toString(),
      icon: DashboardIcon,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      clickable: false,
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
            }}
          >
            {/* Logo and Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(45deg, #a259ff, #c084fc)',
                }}
              >
                <DashboardIcon />
              </Avatar>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #a259ff, #c084fc)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Taskara
              </Typography>
            </Box>

            {/* User Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton sx={{ color: 'text.secondary' }}>
                <Notifications />
              </IconButton>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    backgroundColor: 'primary.main',
                    fontSize: '0.875rem',
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  {user?.name}
                </Typography>
                <IconButton onClick={handleMenuOpen} size="small">
                  <MoreVert />
                </IconButton>
              </Box>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 220,
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  },
                }}
              >
                <MenuItem onClick={handleMenuClose}>
                  <ListItemIcon>
                    <Person fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleMenuClose}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Settings</ListItemText>
                </MenuItem>
                <ThemeToggleMenuItem />
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <ExitToApp fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
              Welcome back, {user?.name}! 👋
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Here's what's happening with your projects today.
            </Typography>
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statsCards.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={stat.title}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    elevation={0}
                    onClick={() => stat.clickable && handleCardClick(stat.title)}
                    sx={{
                      backgroundColor: stat.bgColor,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: stat.clickable ? 'pointer' : 'default',
                      transition: 'all 0.2s ease-in-out',
                      height: '100%',
                      minHeight: '140px',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        borderColor: stat.color,
                        boxShadow: stat.clickable ? `0 4px 20px ${stat.color}20` : 'none',
                        transform: stat.clickable ? 'translateY(-2px)' : 'none',
                      },
                    }}
                  >
                    <CardContent sx={{ 
                      flexGrow: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center' 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {stat.title}
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>
                            {stat.value}
                          </Typography>
                        </Box>
                        <Avatar
                          sx={{
                            backgroundColor: stat.color,
                            color: 'white',
                            width: 48,
                            height: 48,
                          }}
                        >
                          <stat.icon />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Quick Actions & Recent Activity */}
        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Add />}
                      sx={{ justifyContent: 'flex-start' }}
                      onClick={handleCreateProject}
                    >
                      Create New Project
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<People />}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      Invite Team Members
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Getting Started */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Getting Started
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label="1"
                        size="small"
                        sx={{
                          backgroundColor: 'primary.main',
                          color: 'white',
                          fontWeight: 600,
                          minWidth: 24,
                        }}
                      />
                      <Typography variant="body2">
                        Create your first project
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label="2"
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 24 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Upload documents for AI processing
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label="3"
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 24 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Generate work items automatically
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createProjectModalOpen}
        onClose={handleCloseCreateProjectModal}
      />

      {/* Filtered Projects View */}
      {filteredProjectsView && (
        <>
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1200,
            }}
            onClick={() => setFilteredProjectsView(null)}
          />
          <FilteredProjectsView
            filter={filteredProjectsView}
            onClose={() => setFilteredProjectsView(null)}
          />
        </>
      )}
    </Box>
  );
};

export default DashboardPage;