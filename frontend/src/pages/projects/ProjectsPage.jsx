import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Collapse,
  IconButton,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Stack,
  LinearProgress,
  Tooltip,
  Breadcrumbs,
  Link,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  FolderOpen as ProjectIcon,
  BookmarkBorder as StoryIcon,
  ViewStream as EpicIcon,
  Task as TaskIcon,
  MoreVert as MoreVertIcon,
  People as PeopleIcon,
  Flag as FlagIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayIcon,
  AccountTree as HierarchyIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
  fetchProjects, 
  fetchProjectWorkItems,
  fetchWorkItemsHierarchy,
  updateProject,
  clearProjectsError 
} from '../../store/slices/projectsSlice.js';
import CreateProjectModal from '../../components/projects/CreateProjectModal.jsx';
import ProjectHierarchyModal from '../../components/common/ProjectHierarchyModal.jsx';
import LazyPaginationComponent from '../../components/common/LazyPaginationComponent.jsx';
import { useLazyPagination } from '../../hooks/useLazyPagination.js';

const ProjectsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    projects, 
    workItems,
    workItemsHierarchy,
    projectsLoading, 
    workItemsLoading,
    projectsError 
  } = useSelector((state) => state.projects);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState(false);
  const [selectedProjectForHierarchy, setSelectedProjectForHierarchy] = useState(null);

  useEffect(() => {
    dispatch(fetchProjects(false)); // Only include active projects by default
    return () => {
      dispatch(clearProjectsError());
    };
  }, [dispatch]);

  useEffect(() => {
    if (projectsError) {
      toast.error(projectsError);
    }
  }, [projectsError]);

  const handleProjectClick = (project, event) => {
    event.stopPropagation();
    navigate(`/projects/${project.id}`);
  };

  const handleEpicClick = (epic, projectId, event) => {
    event.stopPropagation();
    navigate(`/projects/${projectId}/epics/${epic.id}`);
  };

  const handleStoryClick = (story, projectId, epicId, event) => {
    event.stopPropagation();
    navigate(`/projects/${projectId}/epics/${epicId}/stories/${story.id}`);
  };

  const handleTaskClick = (task, projectId, storyId, epicId, event) => {
    event.stopPropagation();
    navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${task.id}`);
  };

  const handleSubTaskClick = (subTask, projectId, taskId, storyId, epicId, event) => {
    event.stopPropagation();
    navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${taskId}/subtasks/${subTask.id}`);
  };

  const handleExpandClick = async (type, id, projectId = null) => {
    const key = `${type}-${id}`;
    
    if (!expandedItems[key]) {
      // Load data when expanding
      if (type === 'project') {
        // Use the hierarchy endpoint for better performance and structure
        try {
          await dispatch(fetchWorkItemsHierarchy(id));
        } catch (error) {
          // Fallback to fetching epics separately if hierarchy fails
          console.warn('Hierarchy fetch failed, falling back to epics:', error);
          await dispatch(fetchProjectWorkItems({ 
            projectId: id, 
            filters: { item_type: 'epic' } 
          }));
        }
      } else if (type === 'epic') {
        await dispatch(fetchProjectWorkItems({ 
          projectId, 
          filters: { item_type: 'story', parent_id: id } 
        }));
      } else if (type === 'story') {
        await dispatch(fetchProjectWorkItems({ 
          projectId, 
          filters: { item_type: 'task', parent_id: id } 
        }));
      } else if (type === 'task') {
        await dispatch(fetchProjectWorkItems({ 
          projectId, 
          filters: { item_type: 'subtask', parent_id: id } 
        }));
      }
    }
    
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateProject = () => {
    setCreateModalOpen(true);
  };

  const handleCreateModalClose = () => {
    setCreateModalOpen(false);
  };

  const handleOpenHierarchy = (project) => {
    setSelectedProjectForHierarchy(project);
    setHierarchyModalOpen(true);
  };

  const handleCloseHierarchy = () => {
    setHierarchyModalOpen(false);
    setSelectedProjectForHierarchy(null);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo': return 'default';
      case 'in progress': return 'primary';
      case 'in review': return 'warning';
      case 'done': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo': return <ScheduleIcon fontSize="small" />;
      case 'in progress': return <PlayIcon fontSize="small" />;
      case 'done': return <CheckCircleIcon fontSize="small" />;
      default: return <ScheduleIcon fontSize="small" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'highest': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#1976d2';
      case 'low': return '#388e3c';
      case 'lowest': return '#616161';
      default: return '#1976d2';
    }
  };

  // Utility functions for hierarchy management
  const getItemsByTypeAndParent = (projectId, itemType, parentId = null) => {
    const projectWorkItems = workItems[projectId] || [];
    return projectWorkItems.filter(item => 
      item.item_type === itemType && 
      (parentId ? item.parent_id === parentId : !item.parent_id)
    );
  };

  const getHierarchicalData = (projectId) => {
    // First try to use the hierarchical data if available
    if (workItemsHierarchy[projectId]) {
      return workItemsHierarchy[projectId];
    }

    // Fallback to building hierarchy from flat work items
    const projectWorkItems = workItems[projectId] || [];
    const buildHierarchy = (parentId = null) => {
      return projectWorkItems
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildHierarchy(item.id)
        }));
    };

    return buildHierarchy();
  };

  const renderWorkItemIcon = (itemType) => {
    switch (itemType) {
      case 'epic': return <EpicIcon fontSize="small" sx={{ color: 'primary.main' }} />;
      case 'story': return <StoryIcon fontSize="small" sx={{ color: 'success.main' }} />;
      case 'task': return <TaskIcon fontSize="small" sx={{ color: 'warning.main' }} />;
      case 'subtask': return <TaskIcon fontSize="small" sx={{ color: 'info.main' }} />;
      default: return <TaskIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
    }
  };

  // Helper function to find the full hierarchy path for an item
  const findHierarchyPath = (items, targetId, path = []) => {
    for (const item of items) {
      const currentPath = [...path, item];
      
      if (item.id === targetId) {
        return currentPath;
      }
      
      if (item.children && item.children.length > 0) {
        const childPath = findHierarchyPath(item.children, targetId, currentPath);
        if (childPath) {
          return childPath;
        }
      }
    }
    return null;
  };

  const renderHierarchicalItem = (item, projectId, level = 1, itemType = null, hierarchyPath = []) => {
    const type = itemType || item.item_type || item.type;
    const itemKey = `${type}-${item.id}`;
    const isExpanded = expandedItems[itemKey];
    const hasChildren = item.children && item.children.length > 0;
    
    // Calculate indentation based on hierarchy level - more spacing for better hierarchy
    const paddingLeft = 2 + (level * 3);
    const currentPath = [...hierarchyPath, item];

    const handleItemClick = (event) => {
      // Only handle navigation, don't expand
      switch (type) {
        case 'epic':
          handleEpicClick(item, projectId, event);
          break;
        case 'story':
          const epic = currentPath.find(p => p.item_type === 'epic' || p.type === 'epic');
          handleStoryClick(item, projectId, epic?.id, event);
          break;
        case 'task':
          const storyForTask = currentPath.find(p => p.item_type === 'story' || p.type === 'story');
          const epicForTask = currentPath.find(p => p.item_type === 'epic' || p.type === 'epic');
          handleTaskClick(item, projectId, storyForTask?.id, epicForTask?.id, event);
          break;
        case 'subtask':
          const task = currentPath.find(p => p.item_type === 'task' || p.type === 'task');
          const storyForSubtask = currentPath.find(p => p.item_type === 'story' || p.type === 'story');
          const epicForSubtask = currentPath.find(p => p.item_type === 'epic' || p.type === 'epic');
          handleSubTaskClick(item, projectId, task?.id, storyForSubtask?.id, epicForSubtask?.id, event);
          break;
        default:
          break;
      }
    };

    return (
      <React.Fragment key={item.id}>
        {/* Item Row */}
        <ListItem
          disablePadding
          sx={{
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemButton 
            sx={{ 
              py: 1, 
              pl: paddingLeft,
              minHeight: 48,
              '&:hover': {
                bgcolor: 'transparent',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {hasChildren ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpandClick(type, item.id, projectId);
                    }}
                    sx={{ 
                      p: 0.5,
                      mr: 0.5,
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.1rem',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease-in-out',
                      }
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    {renderWorkItemIcon(type)}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', ml: 3 }}>
                  {renderWorkItemIcon(type)}
                </Box>
              )}
            </ListItemIcon>
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant={level === 1 ? "subtitle1" : level === 2 ? "body1" : "body2"}
                    sx={{
                      fontWeight: level === 1 ? 600 : level === 2 ? 500 : 400,
                      color: 'text.primary',
                      cursor: 'pointer',
                      flex: 1,
                      '&:hover': { 
                        color: 'primary.main',
                        textDecoration: 'underline' 
                      },
                    }}
                    onClick={handleItemClick}
                  >
                    {item.title}
                  </Typography>
                  
                  {/* Simplified status indicators - removed flags and reduced clutter */}
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {hasChildren && (
                      <Chip
                        label={item.children.length}
                        size="small"
                        color="default"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                    {item.status && (
                      <Chip
                        label={item.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(item.status)}
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          textTransform: 'capitalize'
                        }}
                      />
                    )}
                  </Box>
                </Box>
              }
              secondary={
                level <= 2 && item.description ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      mt: 0.5,
                    }}
                  >
                    {item.description}
                  </Typography>
                ) : null
              }
            />
          </ListItemButton>
        </ListItem>

        {/* Children Collapse */}
        {hasChildren && (
          <Collapse 
            in={isExpanded} 
            timeout={300}
            unmountOnExit
          >
            <Box 
              sx={{ 
                bgcolor: 'background.default',
                borderLeft: '1px solid',
                borderLeftColor: 'divider',
                ml: paddingLeft / 2,
              }}
            >
              <List disablePadding>
                {item.children.map((child) => 
                  renderHierarchicalItem(child, projectId, level + 1, null, currentPath)
                )}
              </List>
            </Box>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const filteredProjects = projects.filter(project =>
    project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination for projects
  const {
    currentPage: projectsCurrentPage,
    pageSize: projectsPageSize,
    totalPages: projectsTotalPages,
    currentItems: paginatedProjects,
    hasNext: projectsHasNext,
    hasPrev: projectsHasPrev,
    startIndex: projectsStartIndex,
    endIndex: projectsEndIndex,
    totalItems: totalProjects,
    goToNextPage: goToNextProjectsPage,
    goToPrevPage: goToPrevProjectsPage,
    resetPagination: resetProjectsPagination,
  } = useLazyPagination(filteredProjects, 5, 1);

  if (projectsLoading && projects.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: '200px' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 1.5 }}>
      <Container maxWidth="xl">
        {/* Sticky Header Section */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            bgcolor: 'background.default',
            pt: 1,
            pb: 2,
            mb: 2,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            borderRadius: '0 0 8px 8px'
          }}
        >
          {/* Breadcrumbs */}
          <Breadcrumbs 
            separator="›" 
            sx={{ 
              mb: 1, 
              maxWidth: '50%',
              wordBreak: 'break-word',
              '& .MuiBreadcrumbs-separator': {
                mx: 1,
                fontSize: '0.9rem'
              }
            }}
          >
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/dashboard')}
            sx={{ 
              cursor: 'pointer', 
              textDecoration: 'none', 
              color: 'primary.main',
              fontSize: '0.9rem',
              verticalAlign: 'top',
              lineHeight: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { 
                textDecoration: 'none',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 1,
                px: 0.5,
                py: 0.25
              }
            }}
          >
            <HomeIcon sx={{ fontSize: '0.9rem' }} />
            Home
          </Link>
          <Chip
            icon={<ProjectIcon sx={{ fontSize: '0.9rem' }} />}
            label="Projects"
            variant="outlined"
            size="small"
            sx={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'primary.main',
              borderColor: 'primary.main',
              verticalAlign: 'top'
            }}
          />
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 0.5,
                }}
              >
                Projects
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage and track your projects in one place
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateProject}
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              New Project
            </Button>
          </Box>

          {/* Search */}
          <TextField
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
        </Box>
        </Box>

        {/* Projects List */}
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {filteredProjects.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <ProjectIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create your first project to get started'
                }
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateProject}
                  sx={{ textTransform: 'none' }}
                >
                  Create Project
                </Button>
              )}
            </Box>
          ) : (
            <List disablePadding>
              {paginatedProjects.map((project, index) => (
                <React.Fragment key={project.id}>
                  {/* Project Row */}
                  <ListItem
                    disablePadding
                    sx={{
                      borderBottom: index < paginatedProjects.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemButton
                      sx={{
                        py: 1.5,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Tooltip title="View Project Hierarchy" placement="top">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenHierarchy(project);
                            }}
                            sx={{ 
                              p: 0.5,
                              '& .MuiSvgIcon-root': {
                                fontSize: '1rem',
                                color: 'secondary.main',
                              }
                            }}
                          >
                            <HierarchyIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="subtitle1"
                              color="text.primary"
                              sx={{
                                fontWeight: 500,
                                cursor: 'pointer',
                                flex: 1,
                                '&:hover': { 
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                },
                              }}
                              onClick={(e) => handleProjectClick(project, e)}
                            >
                              {project.name}
                            </Typography>
                            <Chip
                              label={project.active ? 'Active' : 'Inactive'}
                              size="small"
                              color={project.active ? 'success' : 'default'}
                              sx={{ 
                                height: 20, 
                                fontSize: '0.7rem',
                                '& .MuiChip-label': { px: 1 }
                              }}
                            />
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
        
        {/* Sticky Pagination */}
        {totalProjects > 0 && (
          <LazyPaginationComponent
            currentPage={projectsCurrentPage}
            totalPages={projectsTotalPages}
            hasNext={projectsHasNext}
            hasPrev={projectsHasPrev}
            startIndex={projectsStartIndex}
            endIndex={projectsEndIndex}
            totalItems={totalProjects}
            onNext={goToNextProjectsPage}
            onPrev={goToPrevProjectsPage}
            itemType="projects"
            showPageInfo={true}
            showFirstLast={false}
            variant="sticky"
          />
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          open={createModalOpen}
          onClose={handleCreateModalClose}
        />

        {/* Project Hierarchy Modal */}
        <ProjectHierarchyModal
          open={hierarchyModalOpen}
          onClose={handleCloseHierarchy}
          projectId={selectedProjectForHierarchy?.id}
          projectName={selectedProjectForHierarchy?.name}
        />
      </Container>
    </Box>
  );
};

export default ProjectsPage;