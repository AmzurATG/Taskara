import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Breadcrumbs,
  Link,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  KeyboardArrowDown as ArrowDownIcon,
  AccountTree as HierarchyIcon,
  BookmarkBorder as EpicIcon,
  Assignment as StoryIcon,
  Task as TaskIcon,
  CheckBox as SubtaskIcon,
  Folder as ProjectIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';

const ProjectHierarchyModal = ({ 
  open, 
  onClose, 
  projectId, 
  projectName,
  initialExpandedItems = [] 
}) => {
  const navigate = useNavigate();
  const [hierarchyData, setHierarchyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [loadingItems, setLoadingItems] = useState({});

  // Initialize expanded items from props
  useEffect(() => {
    if (initialExpandedItems.length > 0) {
      const expandedState = {};
      initialExpandedItems.forEach(itemKey => {
        expandedState[itemKey] = true;
      });
      setExpandedItems(expandedState);
    }
  }, [initialExpandedItems]);

  // Load hierarchy data when modal opens
  useEffect(() => {
    if (open && projectId) {
      loadHierarchyData();
    }
  }, [open, projectId]);

  const loadHierarchyData = async () => {
    setLoading(true);
    try {
      // Get complete project hierarchy data
      const hierarchyData = await projectsAPI.getWorkItemsHierarchy(projectId);
      console.log('=== Loaded Complete Hierarchy for Project ===');
      console.log('Project ID:', projectId);
      console.log('Hierarchy data:', hierarchyData);
      
      // Transform the data to match expected format (backend uses 'type', frontend expects 'item_type')
      const transformItem = (item) => ({
        ...item,
        item_type: item.type, // Map 'type' to 'item_type'
        children: item.children ? item.children.map(transformItem) : undefined
      });
      
      const transformedData = (hierarchyData || []).map(transformItem);
      setHierarchyData(transformedData);
    } catch (error) {
      console.error('Failed to load hierarchy data:', error);
      // Fallback to loading just epics if hierarchy fails
      try {
        const epics = await projectsAPI.getProjectWorkItems(projectId, { item_type: 'epic' });
        console.log('Fallback: Loaded epics only');
        setHierarchyData(epics || []);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        toast.error('Failed to load project hierarchy');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async (itemType, itemId) => {
    const key = `${itemType}-${itemId}`;
    setLoadingItems(prev => ({ ...prev, [key]: true }));
    
    try {
      let children = [];
      
      console.log(`=== Loading children for ${itemType} ${itemId} ===`);
      
      switch (itemType) {
        case 'epic':
          // Use the specific method for getting epic stories which handles filtering properly
          children = await projectsAPI.getEpicStories(itemId, projectId);
          console.log(`Loaded ${children?.length || 0} stories for epic ${itemId}`);
          break;
        case 'story':
          // Use the specific method for getting story tasks which handles filtering properly
          children = await projectsAPI.getStoryTasks(itemId, projectId);
          console.log(`Loaded ${children?.length || 0} tasks for story ${itemId}`);
          break;
        case 'task':
          // Use the specific method for getting task subtasks which handles filtering properly
          children = await projectsAPI.getTaskSubtasks(itemId, projectId);
          console.log(`Loaded ${children?.length || 0} subtasks for task ${itemId}`);
          break;
        default:
          console.warn(`Unknown item type: ${itemType}`);
          return;
      }

      // Log the children for debugging
      if (children && children.length > 0) {
        console.log(`Children loaded:`, children.map(child => ({ 
          id: child.id, 
          title: child.title, 
          parent_id: child.parent_id,
          item_type: child.item_type 
        })));
      } else {
        console.log(`No children found for ${itemType} ${itemId}`);
      }

      // Update hierarchy data by finding the parent and adding children
      setHierarchyData(prevData => {
        const updateItem = (items) => {
          return items.map(item => {
            if (item.id === itemId && item.item_type === itemType) {
              console.log(`Updating ${itemType} ${itemId} with ${children?.length || 0} children`);
              // Always set children array, even if empty, to indicate we've loaded them
              return { ...item, children: children || [] };
            } else if (item.children) {
              return { ...item, children: updateItem(item.children) };
            }
            return item;
          });
        };
        return updateItem(prevData);
      });
    } catch (error) {
      console.error(`Failed to load children for ${itemType} ${itemId}:`, error);
      toast.error(`Failed to load child items`);
    } finally {
      setLoadingItems(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleExpandClick = async (item, event) => {
    event.stopPropagation();
    const key = `${item.item_type}-${item.id}`;
    const willExpand = !expandedItems[key];

    // Since we load complete hierarchy upfront, no need to load children dynamically
    setExpandedItems(prev => ({
      ...prev,
      [key]: willExpand
    }));
  };

  const handleItemClick = (item, event) => {
    event.stopPropagation();
    
    // Navigate to the appropriate page based on item type
    switch (item.item_type) {
      case 'epic':
        navigate(`/projects/${projectId}/epics/${item.id}`);
        onClose();
        break;
      case 'story':
        // Find parent epic by looking at hierarchy
        const parentEpic = findParentEpic(item.id);
        navigate(`/projects/${projectId}/epics/${parentEpic?.id}/stories/${item.id}`);
        onClose();
        break;
      case 'task':
        // Find parent story and epic
        const { parentStory, parentEpic: taskEpic } = findParentPath(item.id);
        navigate(`/projects/${projectId}/epics/${taskEpic?.id}/stories/${parentStory?.id}/tasks/${item.id}`);
        onClose();
        break;
      case 'subtask':
        // Find complete parent path
        const { parentTask, parentStory: subtaskStory, parentEpic: subtaskEpic } = findParentPath(item.id, true);
        navigate(`/projects/${projectId}/epics/${subtaskEpic?.id}/stories/${subtaskStory?.id}/tasks/${parentTask?.id}/subtasks/${item.id}`);
        onClose();
        break;
      default:
        break;
    }
  };

  // Helper function to find parent epic of a story
  const findParentEpic = (storyId) => {
    const findInHierarchy = (items) => {
      for (const item of items) {
        if (item.item_type === 'epic' && item.children) {
          const hasStory = item.children.some(child => child.id === storyId);
          if (hasStory) return item;
        }
        if (item.children) {
          const found = findInHierarchy(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInHierarchy(hierarchyData);
  };

  // Helper function to find complete parent path
  const findParentPath = (itemId, isSubtask = false) => {
    const findInHierarchy = (items, path = []) => {
      for (const item of items) {
        const currentPath = [...path, item];
        
        if (item.children) {
          const hasDirectChild = item.children.some(child => child.id === itemId);
          if (hasDirectChild) {
            return {
              parentTask: isSubtask ? item : null,
              parentStory: isSubtask ? currentPath.find(p => p.item_type === 'story') : item,
              parentEpic: currentPath.find(p => p.item_type === 'epic')
            };
          }
          
          const found = findInHierarchy(item.children, currentPath);
          if (found.parentEpic) return found;
        }
      }
      return { parentTask: null, parentStory: null, parentEpic: null };
    };
    return findInHierarchy(hierarchyData);
  };

  const getItemIcon = (itemType) => {
    switch (itemType) {
      case 'epic':
        return (
          <Tooltip title="Epic" placement="top">
            <EpicIcon sx={{ color: 'primary.main' }} />
          </Tooltip>
        );
      case 'story':
        return (
          <Tooltip title="User Story" placement="top">
            <StoryIcon sx={{ color: 'success.main' }} />
          </Tooltip>
        );
      case 'task':
        return (
          <Tooltip title="Task" placement="top">
            <TaskIcon sx={{ color: 'info.main' }} />
          </Tooltip>
        );
      case 'subtask':
        return (
          <Tooltip title="Subtask" placement="top">
            <SubtaskIcon sx={{ color: 'secondary.main' }} />
          </Tooltip>
        );
      default:
        return (
          <Tooltip title="Task" placement="top">
            <TaskIcon />
          </Tooltip>
        );
    }
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

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'highest': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'success';
      case 'lowest': return 'default';
      default: return 'primary';
    }
  };

  const getChildTypeName = (itemType) => {
    switch (itemType) {
      case 'epic':
        return 'work items';
      case 'story':
        return 'tasks';
      case 'task':
        return 'subtasks';
      default:
        return 'children';
    }
  };

  const renderHierarchyItem = (item, level = 0) => {
    const key = `${item.item_type}-${item.id}`;
    const isExpanded = expandedItems[key];
    const isLoadingChildren = loadingItems[key];
    const hasChildren = item.children && item.children.length > 0;
    const hasLoadedChildren = item.children !== undefined; // Check if we've attempted to load children
    const canHaveChildren = ['epic', 'story', 'task'].includes(item.item_type);
    
    const paddingLeft = 2 + (level * 3);

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={(e) => handleItemClick(item, e)}
            sx={{ 
              pl: paddingLeft,
              py: 0.5,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 48 }}>
              {hasChildren ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip 
                    title={
                      isExpanded 
                        ? `Collapse ${item.item_type}` 
                        : `Expand to show ${item.children?.length || 0} ${getChildTypeName(item.item_type)}`
                    }
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => handleExpandClick(item, e)}
                      disabled={isLoadingChildren}
                      sx={{ 
                        p: 0.3,
                        mr: 1,
                        '& .MuiSvgIcon-root': {
                          fontSize: '1rem',
                          transition: 'transform 0.2s ease-in-out',
                        }
                      }}
                    >
                      {isLoadingChildren ? (
                        <CircularProgress size={14} />
                      ) : isExpanded ? (
                        <ArrowDownIcon />
                      ) : (
                        <ChevronRightIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ mr: 1.5 }}>
                    {getItemIcon(item.item_type)}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', ml: 3, mr: 1.5 }}>
                  {getItemIcon(item.item_type)}
                </Box>
              )}
            </ListItemIcon>
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant={level === 0 ? "subtitle1" : level === 1 ? "body1" : "body2"}
                    sx={{
                      fontWeight: level === 0 ? 600 : level === 1 ? 500 : 400,
                      color: 'text.primary',
                      flex: 1,
                      '&:hover': { 
                        color: 'primary.main',
                      },
                    }}
                  >
                    {item.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {item.status && (
                      <Chip
                        label={item.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(item.status)}
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                    {item.priority && (
                      <Chip
                        label={item.priority}
                        size="small"
                        color={getPriorityColor(item.priority)}
                        variant="outlined"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                    {/* Show children count for items that can have children */}
                    {canHaveChildren && (
                      <Chip
                        label={hasLoadedChildren ? `${item.children?.length || 0}` : '?'}
                        size="small"
                        color={hasLoadedChildren ? (hasChildren ? "primary" : "default") : "secondary"}
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          '& .MuiChip-label': { px: 1 },
                          bgcolor: hasLoadedChildren 
                            ? (hasChildren ? 'primary.main' : 'grey.300')
                            : 'secondary.main',
                          color: hasLoadedChildren 
                            ? (hasChildren ? 'white' : 'text.secondary')
                            : 'white'
                        }}
                      />
                    )}
                  </Box>
                </Box>
              }
              secondary={
                item.description && level < 2 ? (
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {item.description}
                  </Typography>
                ) : null
              }
            />
          </ListItemButton>
        </ListItem>

        {/* Children Collapse - Show when expanded */}
        {isExpanded && hasChildren && (
          <Collapse 
            in={isExpanded} 
            timeout={300}
            unmountOnExit
          >
            <Box 
              sx={{ 
                bgcolor: 'background.default',
                borderLeft: '2px solid',
                borderLeftColor: 'divider',
                ml: paddingLeft / 2,
              }}
            >
              <List disablePadding>
                {item.children.map((child) => 
                  renderHierarchyItem(child, level + 1)
                )}
              </List>
            </Box>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '85vh',
          maxHeight: '800px',
          width: '90vw',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HierarchyIcon color="primary" />
            <Typography variant="h6" component="span">
              Project Hierarchy
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Breadcrumb for current project */}
        <Box sx={{ mt: 0.5 }}>
          <Breadcrumbs separator={">"}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ProjectIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                {projectName || 'Project'}
              </Typography>
            </Box>
          </Breadcrumbs>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        ) : hierarchyData.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <HierarchyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hierarchy data available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start by creating epics for this project
            </Typography>
          </Box>
        ) : (
          <Paper 
            sx={{ 
              height: '100%', 
              overflow: 'auto',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <List sx={{ py: 0 }}>
              {hierarchyData.map((item) => renderHierarchyItem(item))}
            </List>
          </Paper>
        )}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectHierarchyModal;