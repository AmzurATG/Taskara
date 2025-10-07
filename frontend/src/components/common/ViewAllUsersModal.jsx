import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  People,
  Person,
  AdminPanelSettings,
  ExpandMore,
  Assignment,
  Timeline,
  Task,
  CheckBox,
  Layers,
  Close,
  Folder,
  TrendingUp,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api/admin.js';
import toast from 'react-hot-toast';

const ViewAllUsersModal = ({ open, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsersWithProjects();
    }
  }, [open]);

  const fetchUsersWithProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await adminAPI.getUsersWithProjects();
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch users with projects:', err);
      setError('Failed to load user data. Please try again.');
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAccordionChange = (userId) => (event, isExpanded) => {
    setExpandedUser(isExpanded ? userId : false);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'active': 'success',
      'completed': 'primary',
      'in_progress': 'warning',
      'planning': 'info',
      'on_hold': 'error',
      'cancelled': 'error'
    };
    return statusColors[status] || 'default';
  };

  const renderProjectStatistics = (statistics) => {
    if (statistics.error) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <ErrorIcon fontSize="small" />
          <Typography variant="caption">Error loading statistics</Typography>
        </Box>
      );
    }

    const stats = [
      { label: 'Epics', value: statistics.epics, icon: <Layers fontSize="small" />, color: '#6b7280' },
      { label: 'Work Items', value: statistics.userStories, icon: <Assignment fontSize="small" />, color: '#6b7280' },
      { label: 'Tasks', value: statistics.tasks, icon: <Task fontSize="small" />, color: '#6b7280' },
      { label: 'Subtasks', value: statistics.subtasks, icon: <CheckBox fontSize="small" />, color: '#6b7280' },
    ];

    return (
      <Grid container spacing={1} sx={{ mt: 1 }}>
        {stats.map((stat) => (
          <Grid item xs={3} key={stat.label}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                backgroundColor: `${stat.color}10`,
                border: `1px solid ${stat.color}30`,
                textAlign: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                {React.cloneElement(stat.icon, { sx: { color: stat.color } })}
              </Box>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderUserCard = (user) => (
    <motion.div
      key={user.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Accordion
        expanded={expandedUser === user.id}
        onChange={handleUserAccordionChange(user.id)}
        sx={{
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px !important',
          '&:before': { display: 'none' },
          boxShadow: 'none',
          '&.Mui-expanded': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            backgroundColor: user.role === 'admin' ? 'error.main' : 'primary.main',
            color: 'white',
            borderRadius: '8px 8px 0 0',
            '&.Mui-expanded': {
              borderRadius: '8px 8px 0 0',
            },
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
              gap: 2,
            },
          }}
        >
          <Avatar
            sx={{
              backgroundColor: 'white',
              color: user.role === 'admin' ? 'error.main' : 'primary.main',
              width: 40,
              height: 40,
            }}
          >
            {user.role === 'admin' ? <AdminPanelSettings /> : <Person />}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
              {user.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {user.email}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={user.role.toUpperCase()}
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'white',
                color: 'white',
                fontWeight: 600,
              }}
            />
            <Tooltip title={`${user.projectCount} projects, ${user.totalWorkItems} total work items`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Folder fontSize="small" sx={{ color: 'white' }} />
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                  {user.projectCount}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails sx={{ p: 0 }}>
          {user.projects.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No projects assigned to this user
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment />
                Projects ({user.projects.length})
              </Typography>
              
              <Grid container spacing={2}>
                {user.projects.map((project) => (
                  <Grid item xs={12} md={6} key={project.id}>
                    <Card
                      elevation={0}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        height: '100%',
                      }}
                    >
                      <CardContent sx={{ pb: '16px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, mr: 1 }}>
                            {project.name}
                          </Typography>
                          <Chip
                            label={project.status || 'Active'}
                            size="small"
                            color={getStatusColor(project.status)}
                            variant="outlined"
                          />
                        </Box>
                        
                        {project.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {project.description.length > 100
                              ? `${project.description.substring(0, 100)}...`
                              : project.description}
                          </Typography>
                        )}
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUp fontSize="small" />
                          Work Items Statistics
                        </Typography>
                        
                        {renderProjectStatistics(project.statistics)}
                        
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'between', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Total: {project.statistics.totalWorkItems} items
                          </Typography>
                          {project.created_at && (
                            <Typography variant="caption" color="text.secondary">
                              Created: {new Date(project.created_at).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </motion.div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People color="primary" />
            <Typography variant="h6" component="span">
              All Users & Their Projects
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Loading users and their project statistics...
                </Typography>
              </Box>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Alert 
                severity="error" 
                action={
                  <Button color="inherit" size="small" onClick={fetchUsersWithProjects}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            </motion.div>
          ) : users.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Users Found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  There are no users in the system.
                </Typography>
              </Box>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Summary Stats */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Summary
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="primary.main" sx={{ fontWeight: 700 }}>
                        {users.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Users
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main" sx={{ fontWeight: 700 }}>
                        {users.filter(u => u.role === 'admin').length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Admins
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main" sx={{ fontWeight: 700 }}>
                        {users.reduce((sum, user) => sum + user.projectCount, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Projects
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                        {users.reduce((sum, user) => sum + user.totalWorkItems, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Work Items
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Users List */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info fontSize="small" />
                  Click on any user to view their projects and statistics
                </Typography>
                
                {users.map(renderUserCard)}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {!loading && !error && users.length > 0 && (
          <Button onClick={fetchUsersWithProjects} variant="contained" startIcon={<TrendingUp />}>
            Refresh Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ViewAllUsersModal;