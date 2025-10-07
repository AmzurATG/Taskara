import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  FormControl,
  InputLabel,
  Select,
  DialogActions,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
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
  SupervisorAccount,
  ManageAccounts,
  AdminPanelSettings,
  LightMode,
  DarkMode,
  Brightness4,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { logout } from '../../store/slices/authSlice.js';
import { adminAPI } from '../../services/api/admin.js';
import { projectsAPI } from '../../services/api/projects.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import ThemeToggleMenuItem from '../../components/common/ThemeToggleMenuItem.jsx';
import ViewAllUsersModal from '../../components/common/ViewAllUsersModal.jsx';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { themeMode, toggleTheme, isDark } = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [usersCount, setUsersCount] = useState({ total: 0, users: 0, admins: 0 });
  const [projectStats, setProjectStats] = useState({ total: 0, active: 0, completed: 0 });
  const [showRoleManagerDialog, setShowRoleManagerDialog] = useState(false);
  const [showViewAllUsersModal, setShowViewAllUsersModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);

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
        navigate('/projects');
        break;
      case 'Users':
        setShowRoleManagerDialog(true);
        break;
      case 'Active Tasks':
        // Navigate to tasks when implemented
        break;
      case 'Completed':
        // Navigate to completed items when implemented
        break;
      default:
        break;
    }
  };

  const loadUsersCount = async () => {
    try {
      const count = await adminAPI.getUsersCount();
      setUsersCount(count);
    } catch (error) {
      console.error('Failed to load users count:', error);
    }
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

  const loadUsersList = async () => {
    try {
      setLoading(true);
      const users = await adminAPI.getUsers();
      setUsersList(users);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) {
      console.log('Missing selectedUser or selectedRole:', { selectedUser, selectedRole });
      return;
    }

    try {
      setLoading(true);
      console.log('Updating role for user:', selectedUser.id, 'to role:', selectedRole);
      
      const response = await adminAPI.updateUserRole(selectedUser.id, selectedRole);
      console.log('Role update response:', response);
      
      toast.success(`${selectedUser.name}'s role updated to ${selectedRole}`);
      
      // Refresh data
      console.log('Refreshing user lists...');
      await loadUsersList();
      await loadUsersCount();
      
      // Clear selection after successful update
      setSelectedUser(null);
      setSelectedRole('');
    } catch (error) {
      console.error('Failed to update role:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to update user role: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoles = () => {
    setShowRoleManagerDialog(true);
    loadUsersList();
  };

  const handleCloseRoleManager = () => {
    setShowRoleManagerDialog(false);
    setSelectedUser(null);
    setSelectedRole('');
  };

  useEffect(() => {
    loadUsersCount();
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
      title: 'Active Tasks',
      value: projectStats.active.toString(),
      icon: TrendingUp,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      clickable: false,
    },
    {
      title: 'Users',
      value: usersCount.total.toString(),
      icon: People,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      clickable: true,
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
              <Chip 
                label="Admin" 
                size="small" 
                icon={<AdminPanelSettings />}
                sx={{
                  backgroundColor: 'error.main',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
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
                    backgroundColor: 'error.main',
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
              Here's what's happening in your admin dashboard today.
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
                          {stat.title === 'Users' && (
                            <Typography variant="caption" color="text.secondary">
                              {usersCount.admins} admins, {usersCount.users} users
                            </Typography>
                          )}
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

        {/* Quick Actions & Admin Tools */}
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
                      onClick={() => navigate('/projects')}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      Create New Project
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ManageAccounts />}
                      onClick={handleManageRoles}
                      sx={{ 
                        justifyContent: 'flex-start',
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          borderColor: 'primary.dark',
                          backgroundColor: 'primary.main',
                          color: 'white',
                        }
                      }}
                    >
                      Manage User Roles
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Admin Tools */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Admin Tools
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label="1"
                        size="small"
                        sx={{
                          backgroundColor: 'error.main',
                          color: 'white',
                          fontWeight: 600,
                          minWidth: 24,
                        }}
                      />
                      <Typography variant="body2">
                        Manage user roles and permissions
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
                        Monitor system activity and usage
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
                        Configure system settings
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Role Management Dialog */}
      <Dialog 
        open={showRoleManagerDialog} 
        onClose={handleCloseRoleManager}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ManageAccounts color="error" />
              <Typography variant="h6" component="span">
                Manage User Roles
              </Typography>
            </Box>
            <IconButton
              onClick={handleCloseRoleManager}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Summary Stats */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              User Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                    {usersList.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
                    {usersList.filter(u => u.role === 'admin').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Admins
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="info.main" sx={{ fontWeight: 700 }}>
                    {usersList.filter(u => u.role === 'user').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Regular Users
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Manage user roles and permissions. Changes take effect immediately.
            </Typography>
          </Box>
          
          <TableContainer 
            component={Paper} 
            variant="outlined"
            sx={{ 
              maxHeight: 400,
              '& .MuiTableCell-head': {
                backgroundColor: 'action.hover',
                fontWeight: 600,
              }
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Current Role</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Loading users...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : usersList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  usersList.map((u) => (
                  <TableRow 
                    key={u.id}
                    sx={{ 
                      '&:hover': { backgroundColor: 'action.hover' },
                      backgroundColor: selectedUser?.id === u.id ? 'action.selected' : 'transparent',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          sx={{
                            backgroundColor: u.role === 'admin' ? 'error.main' : 'primary.main',
                            width: 32,
                            height: 32,
                          }}
                        >
                          {u.role === 'admin' ? <AdminPanelSettings fontSize="small" /> : <Person fontSize="small" />}
                        </Avatar>
                        <Typography variant="subtitle1" fontWeight={500}>
                          {u.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {u.email}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={u.role.toUpperCase()} 
                        size="small" 
                        color={u.role === 'admin' ? 'error' : 'primary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {u.id === user?.id ? (
                        <Button size="small" variant="outlined" disabled>
                          You
                        </Button>
                      ) : (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={u.role}
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              if (newRole !== u.role) {
                                try {
                                  setLoading(true);
                                  await adminAPI.updateUserRole(u.id, newRole);
                                  toast.success(`${u.name}'s role updated to ${newRole}`);
                                  await loadUsersList();
                                  await loadUsersCount();
                                } catch (error) {
                                  toast.error(`Failed to update user role: ${error.response?.data?.detail || error.message}`);
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            disabled={loading}
                          >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* View All Users Modal */}
      <ViewAllUsersModal
        open={showViewAllUsersModal}
        onClose={() => setShowViewAllUsersModal(false)}
      />
    </Box>
  );
};

export default AdminDashboard;