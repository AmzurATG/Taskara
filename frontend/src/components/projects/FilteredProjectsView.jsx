import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Divider,
  IconButton,
  Button,
  Switch,
  alpha,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  FolderOpen as ProjectIcon,
  PowerSettingsNew as PowerIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';

const FilteredProjectsView = ({ 
  filter = 'all', // 'all', 'active', 'inactive'
  onClose 
}) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingProject, setTogglingProject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await projectsAPI.getAllProjects(true); // Always get all projects
      
      let filteredProjects = allProjects;
      if (filter === 'active') {
        filteredProjects = allProjects.filter(p => p.active);
      } else if (filter === 'inactive') {
        filteredProjects = allProjects.filter(p => !p.active);
      }
      
      setProjects(filteredProjects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    if (project.active) {
      // Navigate to project detail for active projects
      navigate(`/projects/${project.id}`);
      if (onClose) onClose();
    } else {
      // For inactive projects, show a helpful message
      toast.info(
        `Project "${project.name}" is inactive. Use the toggle switch to activate it first.`,
        {
          icon: '💡',
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            fontWeight: 500,
          },
        }
      );
    }
  };

  const handleToggleProjectStatus = async (project, event) => {
    event.stopPropagation();
    
    if (togglingProject === project.id) return; // Prevent double-clicks
    
    try {
      setTogglingProject(project.id);
      const newActiveStatus = !project.active;
      await projectsAPI.toggleProjectActiveStatus(project.id, newActiveStatus);
      
      // Update only the specific project in the state instead of refetching all
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === project.id 
            ? { ...p, active: newActiveStatus }
            : p
        )
      );
      
      toast.success(
        `Project "${project.name}" ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
        {
          icon: newActiveStatus ? '🚀' : '⏸️',
          duration: 4000,
          style: {
            background: newActiveStatus ? 
              'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1))' :
              'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(248, 113, 113, 0.1))',
            border: newActiveStatus ? 
              '1px solid rgba(16, 185, 129, 0.3)' :
              '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            fontWeight: 500,
          },
        }
      );
    } catch (error) {
      console.error('Failed to toggle project status:', error);
      toast.error('Failed to update project status');
    } finally {
      setTogglingProject(null);
    }
  };

  const getTitle = () => {
    switch (filter) {
      case 'active':
        return 'Active Projects';
      case 'inactive':
        return 'Inactive Projects';
      default:
        return 'All Projects';
    }
  };

  const renderProjectsByStatus = () => {
    if (filter !== 'all') {
      // For filtered views, show projects in a single table
      return (
        <ProjectTable 
          projects={projects}
          onProjectClick={handleProjectClick}
          onToggleStatus={handleToggleProjectStatus}
          togglingProject={togglingProject}
        />
      );
    }

    // For 'all' view, show projects side by side
    const activeProjects = projects.filter(p => p.active);
    const inactiveProjects = projects.filter(p => !p.active);

    return (
      <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
        {/* Active Projects Side */}
        <Box sx={{ 
          flex: 1, 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              color: 'success.main', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0
            }}
          >
            <PowerIcon sx={{ fontSize: 20 }} />
            Active Projects ({activeProjects.length})
          </Typography>
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            maxHeight: '400px', // Set a max height to ensure scrolling is needed
            pr: 1, // Add padding for scrollbar space
            '&::-webkit-scrollbar': {
              width: '12px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'linear-gradient(180deg, #757575, #424242)',
              borderRadius: '6px',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              '&:hover': {
                background: 'linear-gradient(180deg, #9e9e9e, #616161)',
              },
              '&:active': {
                background: 'linear-gradient(180deg, #424242, #212121)',
              },
            },
            // Firefox scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: '#757575 rgba(255,255,255,0.1)',
          }}>
            {activeProjects.length > 0 ? (
              <ProjectTable 
                projects={activeProjects}
                onProjectClick={handleProjectClick}
                onToggleStatus={handleToggleProjectStatus}
                togglingProject={togglingProject}
              />
            ) : (
              <Box sx={{ 
                p: 4, 
                textAlign: 'center', 
                color: 'text.secondary',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}>
                <Typography variant="body2">
                  No active projects yet
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Vertical Divider */}
        <Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />

        {/* Inactive Projects Side */}
        <Box sx={{ 
          flex: 1, 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              color: 'text.secondary', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0
            }}
          >
            <PowerIcon sx={{ fontSize: 20, opacity: 0.5 }} />
            Inactive Projects ({inactiveProjects.length})
          </Typography>
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            maxHeight: '400px', // Set a max height to ensure scrolling is needed
            pr: 1, // Add padding for scrollbar space
            '&::-webkit-scrollbar': {
              width: '12px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'linear-gradient(180deg, #757575, #424242)',
              borderRadius: '6px',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              '&:hover': {
                background: 'linear-gradient(180deg, #9e9e9e, #616161)',
              },
              '&:active': {
                background: 'linear-gradient(180deg, #424242, #212121)',
              },
            },
            // Firefox scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: '#757575 rgba(255,255,255,0.1)',
          }}>
            {inactiveProjects.length > 0 ? (
              <ProjectTable 
                projects={inactiveProjects}
                onProjectClick={handleProjectClick}
                onToggleStatus={handleToggleProjectStatus}
                togglingProject={togglingProject}
              />
            ) : (
              <Box sx={{ 
                p: 4, 
                textAlign: 'center', 
                color: 'text.secondary',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}>
                <Typography variant="body2">
                  No inactive projects
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <AnimatePresence>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha('#000', 0.5),
            zIndex: 1299,
            backdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
        />
        
        {/* Loading Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <Paper
            elevation={24}
            sx={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: 400,
              zIndex: 1300,
              bgcolor: 'background.paper',
              borderRadius: 3,
              p: 4,
              textAlign: 'center',
            }}
          >
            <CircularProgress 
              size={48} 
              thickness={4} 
              sx={{ 
                mb: 2,
                color: 'primary.main',
              }} 
            />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Loading Projects
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fetching your project data...
            </Typography>
          </Paper>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: alpha('#000', 0.5),
          zIndex: 1299,
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Paper
          elevation={24}
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '95%',
            maxWidth: 1200,
            maxHeight: '85vh',
            overflow: 'hidden',
            zIndex: 1300,
            bgcolor: 'background.paper',
            borderRadius: 3,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#21cbf3', 0.1)} 100%)`,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                {getTitle()}
              </Typography>
              <Chip 
                label={`${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
                color="primary"
                size="small"
                sx={{ fontWeight: 500 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchProjects} size="small" disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton onClick={onClose} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ 
            p: 3, 
            maxHeight: 'calc(85vh - 100px)', 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: alpha('#000', 0.1),
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha('#000', 0.3),
              borderRadius: 4,
              '&:hover': {
                backgroundColor: alpha('#000', 0.5),
              },
            },
          }}>
            {projects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <motion.div
                    animate={{ 
                      rotateY: [0, 180, 360],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <ProjectIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  </motion.div>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                    No projects found
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 300, mx: 'auto' }}>
                    {filter === 'active' ? 'No active projects available. Create a new project or activate an existing one.' : 
                     filter === 'inactive' ? 'Great! All your projects are currently active.' : 
                     'No projects have been created yet. Start by creating your first project.'}
                  </Typography>
                  
                  {/* Action suggestions */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {filter !== 'inactive' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={onClose}
                        sx={{
                          textTransform: 'none',
                          borderRadius: 2,
                        }}
                      >
                        Create New Project
                      </Button>
                    )}
                    <Button
                      variant="text"
                      size="small"
                      onClick={onClose}
                      sx={{
                        textTransform: 'none',
                        color: 'text.secondary',
                      }}
                    >
                      Go Back
                    </Button>
                  </Box>
                </Box>
              </motion.div>
            ) : (
              renderProjectsByStatus()
            )}
          </Box>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

const ProjectTable = ({ projects, onProjectClick, onToggleStatus, togglingProject }) => {
  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: alpha('#2196f3', 0.05) }}>
            <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Project</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: 'text.primary' }}>Status</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: 'text.primary' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {projects.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                index={index}
                onProjectClick={onProjectClick}
                onToggleStatus={onToggleStatus}
                isToggling={togglingProject === project.id}
              />
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ProjectRow = ({ project, index, onProjectClick, onToggleStatus, isToggling }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: 1, 
        x: 0,
        transition: {
          duration: 0.3,
          delay: Math.min(index * 0.05, 0.3),
        }
      }}
      exit={{ 
        opacity: 0, 
        x: -20,
        transition: { duration: 0.2 }
      }}
      whileHover={{ 
        backgroundColor: alpha('#2196f3', 0.02),
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        cursor: project.active ? 'pointer' : 'default',
      }}
      onClick={(e) => {
        if (project.active && !e.defaultPrevented) {
          onProjectClick(project);
        }
      }}
    >
      <TableCell
        component="td"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
          transition: 'all 0.2s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Project Icon */}
          <Avatar
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: project.active ? 
                'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))' : 
                'linear-gradient(135deg, rgba(117, 117, 117, 0.1), rgba(117, 117, 117, 0.05))',
              border: `1px solid ${project.active ? 'rgba(76, 175, 80, 0.2)' : 'rgba(117, 117, 117, 0.1)'}`,
              transition: 'all 0.3s ease',
            }}
          >
            <ProjectIcon 
              sx={{ 
                fontSize: 20, 
                color: project.active ? 'success.main' : 'text.disabled',
              }} 
            />
          </Avatar>

          {/* Project Name */}
          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: project.active ? 'text.primary' : 'text.secondary',
                transition: 'color 0.3s ease',
              }}
            >
              {project.name}
            </Typography>
            
          </Box>
        </Box>
      </TableCell>

      <TableCell
        align="center"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Chip
          label={project.active ? 'Active' : 'Inactive'}
          size="small"
          icon={
            <PowerIcon 
              sx={{ 
                fontSize: '14px !important',
                color: project.active ? 'success.main' : 'text.disabled',
              }} 
            />
          }
          variant={project.active ? 'filled' : 'outlined'}
          sx={{
            height: 28,
            fontSize: '0.75rem',
            fontWeight: 600,
            border: project.active ? 'none' : '1px solid',
            borderColor: 'divider',
            background: project.active ? 
              'linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(52, 211, 153, 0.9))' :
              'transparent',
            color: project.active ? 'white' : 'text.secondary',
            transition: 'all 0.3s ease',
            '& .MuiChip-icon': {
              width: 14,
              height: 14,
              color: 'inherit',
            },
          }}
        />
      </TableCell>

      <TableCell
        align="center"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 600,
              fontSize: '0.75rem',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {project.active ? 'Deactivate' : 'Activate'}
          </Typography>
          
          <Tooltip 
            title={
              <Box sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {project.active ? 'Deactivate Project' : 'Activate Project'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {project.active ? 'Project will be hidden from active lists' : 'Project will become available'}
                </Typography>
              </Box>
            }
            arrow
            placement="top"
          >
            <Box sx={{ position: 'relative' }}>
              <Switch
                checked={project.active}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleStatus(project, e);
                }}
                disabled={isToggling}
                size="small"
                color={project.active ? 'error' : 'success'}
                sx={{
                  '& .MuiSwitch-switchBase': {
                    transition: 'all 0.3s ease',
                    '&.Mui-checked': {
                      color: '#fff',
                      '& + .MuiSwitch-track': {
                        backgroundColor: project.active ? '#ef4444' : '#10b981',
                        opacity: 1,
                      },
                    },
                  },
                  '& .MuiSwitch-thumb': {
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  },
                  '& .MuiSwitch-track': {
                    backgroundColor: '#374151',
                    opacity: 1,
                    transition: 'all 0.3s ease',
                  },
                }}
              />
              {isToggling && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <CircularProgress
                    size={20}
                    thickness={4}
                    sx={{
                      color: project.active ? 'error.main' : 'success.main',
                    }}
                  />
                </Box>
              )}
            </Box>
          </Tooltip>
        </Box>
      </TableCell>
    </motion.tr>
  );
};

export default FilteredProjectsView;