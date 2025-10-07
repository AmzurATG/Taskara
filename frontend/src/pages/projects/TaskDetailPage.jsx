import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Button,
  Stack,
  Breadcrumbs,
  Link,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  PlayArrow as PlayIcon,
  Task as TaskIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Archive as InactiveIcon,
  Home as HomeIcon,
  FolderOpen as ProjectIcon,
  ViewStream as EpicIcon,
  BookmarkBorder as StoryIcon,
} from '@mui/icons-material';

import { useWorkItem, useProjectWorkItems, useProjectHierarchy } from '../../contexts/ProjectHierarchyContext';
import InlineEditableText from '../../components/common/InlineEditableText';
import ExpandableInlineDescription from '../../components/common/ExpandableInlineDescription';
import ViewToggle from '../../components/common/ViewToggle.jsx';
import WorkItemDisplay from '../../components/common/WorkItemDisplay.jsx';
import LazyPaginationComponent from '../../components/common/LazyPaginationComponent.jsx';
import { useLazyPagination } from '../../hooks/useLazyPagination.js';
import DeleteConfirmationDialog from '../../components/common/DeleteConfirmationDialog.jsx';
import StatusDropdown from '../../components/common/StatusDropdown.jsx';
import PriorityDropdown from '../../components/common/PriorityDropdown.jsx';
import ActiveStatusToggle from '../../components/common/ActiveStatusToggle.jsx';
import InactiveChildItemsModal from '../../components/modals/InactiveChildItemsModal.jsx';
import { deleteTask, updateTask } from '../../store/slices/projectsSlice';
import { setViewPreference } from '../../store/slices/uiSlice.js';
import { projectsAPI } from '../../services/api/projects';
import { workItemsAPI } from '../../services/api/workItems';

// Helper functions for status and priority styling
const getStatusIcon = (status) => {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return <CheckCircleIcon sx={{ fontSize: 16 }} />;
    case 'REVIEWED':
      return <PlayIcon sx={{ fontSize: 16 }} />;
    case 'IN_REVIEW':
      return <ScheduleIcon sx={{ fontSize: 16 }} />;
    case 'AI_GENERATED':
    default:
      return <ScheduleIcon sx={{ fontSize: 16 }} />;
  }
};

const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return 'success';
    case 'REVIEWED':
      return 'primary';
    case 'IN_REVIEW':
      return 'warning';
    case 'AI_GENERATED':
    default:
      return 'default';
  }
};

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return '#d32f2f';
    case 'high':
      return '#f57c00';
    case 'medium':
      return '#1976d2';
    case 'low':
      return '#388e3c';
    case 'lowest':
      return '#616161';
    default:
      return '#1976d2';
  }
};

const TaskDetailPage = () => {
  const { projectId, epicId, storyId, taskId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [updating, setUpdating] = useState({ title: false, description: false });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
  const [addSubtaskDialogOpen, setAddSubtaskDialogOpen] = useState(false);
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    priority: 'medium'  // Use backend enum values (lowercase)
  });

  // Inactive subtasks state
  const [inactiveSubtasksModalOpen, setInactiveSubtasksModalOpen] = useState(false);
  const [inactiveSubtasksCount, setInactiveSubtasksCount] = useState(0);

  // Get current task and related items - ensure IDs exist before fetching
  const { workItem: currentTask, loading: taskLoading, refetch: refetchTask } = useWorkItem(projectId, taskId);
  const { workItem: currentStory } = useWorkItem(projectId, storyId);
  const { workItem: currentEpic } = useWorkItem(projectId, epicId);
  const { workItem: currentProject } = useWorkItem(projectId, projectId);
  const { fetchHierarchy } = useProjectHierarchy();
  
  // Get project from Redux store as fallback - handle both string and number IDs
  const projectFromStore = useSelector(state => 
    state.projects.projects.find(p => 
      p.id === projectId || 
      p.id === parseInt(projectId) || 
      p.id?.toString() === projectId
    )
  );
  
  const { viewPreferences } = useSelector((state) => state.ui);

  // Fetch project details directly from API as most reliable source
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (projectId) {
        try {
          const project = await projectsAPI.getProject(projectId);
          setProjectDetails(project);
          console.log('Fetched project details:', project);
        } catch (error) {
          console.error('Failed to fetch project details:', error);
        }
      }
    };
    fetchProjectDetails();
  }, [projectId]);

  // Fetch inactive subtasks count when component mounts and taskId is available
  useEffect(() => {
    if (taskId) {
      fetchInactiveSubtasksCount();
    }
  }, [taskId]);

  // Debug current task and project data (removed to prevent re-render loops)

  // Get subtasks using the parent filter - only when currentTask.id is available
  const { workItems: directSubtasks, loading: subtasksLoading, refetch: refetchSubtasks } = useProjectWorkItems(
    projectId, 
    'subtask', 
    currentTask?.id || null // Only fetch when we have a task ID
  );

  // Also get all subtasks as fallback
  const { workItems: allSubtasks, loading: allSubtasksLoading } = useProjectWorkItems(projectId, 'subtask');

  // Get final subtasks to display
  const subtasksToDisplay = React.useMemo(() => {
    // Return empty array if we don't have a current task yet
    if (!currentTask?.id) {
      return [];
    }

    // First try direct subtasks
    if (directSubtasks && Array.isArray(directSubtasks) && directSubtasks.length > 0) {
      // Filter to only show active subtasks
      return directSubtasks.filter(subtask => subtask.active !== false);
    }

    // Fallback: filter all subtasks by parent_id
    if (allSubtasks && Array.isArray(allSubtasks) && allSubtasks.length > 0) {
      const filtered = allSubtasks.filter(subtask => {
        // Handle both string and number comparisons
        const taskId = currentTask.id;
        const parentId = subtask.parent_id;
        
        const isChild = parentId === taskId || 
               parentId?.toString() === taskId?.toString() ||
               parentId === parseInt(taskId) ||
               parseInt(parentId) === parseInt(taskId);
        
        // Only return active subtasks that belong to this task
        return isChild && subtask.active !== false;
      });
      return filtered;
    }

    return [];
  }, [directSubtasks, allSubtasks, currentTask?.id]); // Only depend on currentTask.id, not the whole object

  // Pagination for subtasks
  const {
    currentPage: subtasksCurrentPage,
    pageSize: subtasksPageSize,
    totalPages: subtasksTotalPages,
    currentItems: paginatedSubtasks,
    hasNext: subtasksHasNext,
    hasPrev: subtasksHasPrev,
    startIndex: subtasksStartIndex,
    endIndex: subtasksEndIndex,
    totalItems: totalSubtasks,
    goToNextPage: goToNextSubtasksPage,
    goToPrevPage: goToPrevSubtasksPage,
    resetPagination: resetSubtasksPagination,
  } = useLazyPagination(subtasksToDisplay, 5, 1);

  // Debug subtasks (removed to prevent re-render loops)

  // Helper functions (using the ones defined at the top of the file)

  const handleBackToStory = () => {
    navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}`);
  };

  const handleTaskTitleUpdate = async (newTitle) => {
    if (!newTitle.trim()) {
      toast.error('Task title cannot be empty');
      return false;
    }

    setUpdating(prev => ({ ...prev, title: true }));
    try {
      const updateData = { title: newTitle };
      
      await dispatch(updateTask({
        id: currentTask.id,
        data: updateData,
        projectId
      })).unwrap();
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentTask.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentTask.id, 'IN_REVIEW');
        console.log('Task status updated from AI_GENERATED to IN_REVIEW');
      }
      
      // Refresh task data to show updated title immediately
      if (refetchTask) {
        await refetchTask();
      }
      
      toast.success('Task title updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update task title:', error);
      toast.error('Failed to update task title');
      return false;
    } finally {
      setUpdating(prev => ({ ...prev, title: false }));
    }
  };

  const handleTaskDescriptionUpdate = async (newDescription) => {
    setUpdating(prev => ({ ...prev, description: true }));
    try {
      const updateData = { description: newDescription };
      
      await dispatch(updateTask({
        id: currentTask.id,
        data: updateData,
        projectId
      })).unwrap();
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentTask.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentTask.id, 'IN_REVIEW');
        console.log('Task status updated from AI_GENERATED to IN_REVIEW');
      }
      
      // Refresh task data to show updated description immediately
      if (refetchTask) {
        await refetchTask();
      }
      
      toast.success('Task description updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update task description:', error);
      toast.error('Failed to update task description');
      return false;
    } finally {
      setUpdating(prev => ({ ...prev, description: false }));
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask) return;

    setDeleting(true);
    try {
      await dispatch(deleteTask(currentTask.id)).unwrap();
      toast.success('Task deleted successfully');
      navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCreateSubtask = async () => {
    if (!newSubtask.title.trim()) {
      toast.error('Subtask title is required');
      return;
    }

    setCreatingSubtask(true);
    try {
      const subtaskData = {
        title: newSubtask.title,
        description: newSubtask.description || '',
        item_type: 'subtask',
        priority: newSubtask.priority, // Already in correct format (MEDIUM, HIGH, etc.)
        project_id: projectId, // Required by WorkItemCreate schema
        parent_id: currentTask.id,
        acceptance_criteria: null,
        estimated_hours: null,
        order_index: 0
      };

      console.log('Creating subtask with data:', subtaskData);
      console.log('Project ID:', projectId, 'Task ID:', currentTask.id);
      
      await projectsAPI.createWorkItem(projectId, subtaskData);
      toast.success('Subtask created successfully');
      
      // Reset form and close dialog
      setNewSubtask({
        title: '',
        description: '',
        priority: 'medium'
      });
      setAddSubtaskDialogOpen(false);
      
      // Refresh the subtasks list to show the new subtask
      refetchSubtasks();
    } catch (error) {
      console.error('Failed to create subtask:', error);
      toast.error('Failed to create subtask');
    } finally {
      setCreatingSubtask(false);
    }
  };

  const handleSubtaskInputChange = (field, value) => {
    setNewSubtask(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubtaskClick = (subtask) => {
    // Navigate to subtask detail page
    console.log('🔗 Navigating to subtask:', subtask);
    console.log('🔗 Subtask ID:', subtask.id, 'Type:', typeof subtask.id);
    
    if (!subtask || !subtask.id) {
      console.error('❌ Cannot navigate: Subtask or subtask ID is missing');
      toast.error('Cannot open subtask: Missing subtask information');
      return;
    }
    
    const navigationUrl = `/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${taskId}/subtasks/${subtask.id}`;
    console.log('🔗 Navigation URL:', navigationUrl);
    navigate(navigationUrl);
  };

  const handleViewChange = (newView) => {
    dispatch(setViewPreference({ itemType: 'subtasks', view: newView }));
  };

  // Inactive subtasks functions
  const fetchInactiveSubtasksCount = async () => {
    try {
      const response = await workItemsAPI.getInactiveChildWorkItems(taskId, 'subtask');
      setInactiveSubtasksCount(response?.length || 0);
    } catch (error) {
      console.error('Error fetching inactive subtasks count:', error);
    }
  };

  const handleViewInactiveSubtasks = () => {
    setInactiveSubtasksModalOpen(true);
  };

  const handleSubtaskActivated = (updatedSubtask) => {
    // Refresh the inactive count
    fetchInactiveSubtasksCount();
    // Refresh the active subtasks list immediately
    if (refetchSubtasks) {
      refetchSubtasks();
    }
    // Refresh hierarchy to ensure all pages are synchronized
    if (fetchHierarchy && projectId) {
      fetchHierarchy(projectId, true);
    }
  };

  const handleSubtaskStatusChange = async (subtaskId, newStatus) => {
    try {
      await projectsAPI.updateWorkItem(subtaskId, { status: newStatus });
      toast.success('Subtask status updated successfully');
      // Only refresh the project hierarchy without full page refresh
      await fetchHierarchy(projectId, true);
    } catch (error) {
      console.error('Failed to update subtask status:', error);
      toast.error('Failed to update subtask status');
    }
  };

  const handleSubtaskPriorityChange = async (subtaskId, newPriority) => {
    try {
      await projectsAPI.updateWorkItem(subtaskId, { priority: newPriority });
      toast.success('Subtask priority updated successfully');
      // Only refresh the project hierarchy without full page refresh
      await fetchHierarchy(projectId, true);
    } catch (error) {
      console.error('Failed to update subtask priority:', error);
      toast.error('Failed to update subtask priority');
    }
  };

  // Show loading state while task is being fetched
  if (taskLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: '200px' }} />
      </Box>
    );
  }

  // Show error state if task not found after loading
  if (!taskLoading && !currentTask) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Task not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 1.5 }}>
      <Container maxWidth="xl">
        {/* Enhanced Sticky Header Section with Title, Description, and Stats */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 101, // Higher z-index
            bgcolor: 'background.default',
            pt: 2.5, // Increased padding above title section
            pb: 2, // Increased padding below title section
            mb: 0.3, // Reduced margin
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)', // Enhanced shadow for better visibility
            borderRadius: '0 0 8px 8px',
            backdropFilter: 'blur(10px)', // Glass effect
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
              onClick={() => navigate('/')}
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
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/projects')}
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
              <ProjectIcon sx={{ fontSize: '0.9rem' }} />
              Projects
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}`)}
              title={projectDetails?.name || projectDetails?.title || currentProject?.name || currentProject?.title || projectFromStore?.name || projectFromStore?.title || 'Project'}
              sx={{ 
                cursor: 'pointer', 
                textDecoration: 'none', 
                color: 'primary.main', 
                fontSize: '0.9rem',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                verticalAlign: 'top',
                lineHeight: 1.5,
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
              <ProjectIcon sx={{ fontSize: '0.9rem' }} />
              {projectDetails?.name || projectDetails?.title || currentProject?.name || currentProject?.title || projectFromStore?.name || projectFromStore?.title || 'Project'}
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}/epics/${epicId}`)}
              title={`Epic: ${currentEpic?.title || currentEpic?.name || 'Epic'}`}
              sx={{ 
                cursor: 'pointer', 
                textDecoration: 'none', 
                color: 'primary.main', 
                fontSize: '0.9rem',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                verticalAlign: 'top',
                lineHeight: 1.5,
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
              <EpicIcon sx={{ fontSize: '0.9rem' }} />
              {currentEpic?.title || currentEpic?.name || 'Epic'}
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}`)}
              title={`Story: ${currentStory?.title || currentStory?.name || 'Story'}`}
              sx={{ 
                cursor: 'pointer', 
                textDecoration: 'none', 
                color: 'primary.main', 
                fontSize: '0.9rem',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                verticalAlign: 'top',
                lineHeight: 1.5,
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
              <StoryIcon sx={{ fontSize: '0.9rem' }} />
              {currentStory?.title || currentStory?.name || 'Story'}
            </Link>
            <Chip
              icon={<TaskIcon sx={{ fontSize: '0.9rem' }} />}
              label={currentTask?.title || currentTask?.name || 'Task'}
              variant="outlined"
              size="small"
              title={`Task: ${currentTask?.title || currentTask?.name || 'Task'}`}
              sx={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'success.main',
                borderColor: 'success.main',
                maxWidth: '170px',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '130px'
                },
                verticalAlign: 'top'
              }}
            />
          </Breadcrumbs>

          {/* Compact Task Header */}
          <Box sx={{ p: 1, mb: 0.5, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 28, height: 28, fontSize: '0.8rem' }}>
                  {currentTask.key || 'T'}
                </Avatar>
                <InlineEditableText
                  value={currentTask.title || currentTask.name || ''}
                  onSave={handleTaskTitleUpdate}
                  variant="h6"
                  sx={{ fontWeight: 600, fontSize: '1.1rem' }}
                  disabled={updating.title}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatusDropdown
                  workItemId={currentTask.id}
                  currentStatus={currentTask.status}
                  onStatusChange={(newStatus) => {
                    console.log('Task status updated to:', newStatus);
                  }}
                  variant="chip"
                  size="medium"
                />
                <PriorityDropdown
                  workItemId={currentTask.id}
                  currentPriority={currentTask.priority}
                  onPriorityChange={async (newPriority) => {
                    console.log('Task priority updated to:', newPriority);
                    // Refresh task data when priority is changed
                    if (refetchTask) await refetchTask();
                    await fetchHierarchy(projectId, true);
                  }}
                  size="small"
                  variant="chip"
                />
                <ActiveStatusToggle
                  itemType="task"
                  itemId={currentTask.id}
                  itemTitle={currentTask.title || currentTask.name || 'Task'}
                  currentStatus={currentTask.active}
                  onStatusChange={async (itemId, newStatus) => {
                    try {
                      // Update the current task via API call
                      await projectsAPI.toggleWorkItemActiveStatus(itemId, { active: newStatus });
                      
                      // Refresh the project hierarchy to update parent pages
                      fetchHierarchy(projectId, true);
                      
                      if (newStatus) {
                        // If reactivating, refetch task data to get updated state
                        if (refetchTask) refetchTask();
                        if (refetchSubtasks) refetchSubtasks();
                      } else {
                        // If deactivating, redirect to parent story (toast handled by ActiveStatusToggle)
                        navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}`);
                      }
                    } catch (error) {
                      console.error('Failed to toggle task status:', error);
                      throw error; // Re-throw to let ActiveStatusToggle handle the error
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Expandable Description Section */}
            <Box sx={{ mt: 0.5 }}>
              <ExpandableInlineDescription
                value={currentTask.description || ""}
                onSave={handleTaskDescriptionUpdate}
                field="description"
                placeholder="Add a description for this task..."
                loading={updating.description}
                sx={{
                  fontSize: '0.75rem',
                  '& .MuiTypography-root': {
                    fontSize: '0.75rem',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Ultra-Compact Task Stats (now in same sticky section) */}
          {(subtasksToDisplay.length > 0 || inactiveSubtasksCount > 0) && (
            <Grid container spacing={1} sx={{ mb: 0, mt: 2 }}> {/* No margin below stats cards, added top margin for compact look */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.2)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TaskIcon sx={{ color: 'primary.main', fontSize: '1rem' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
                          {subtasksToDisplay.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 500 }}>Total Subtasks</span>
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.2)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PlayIcon sx={{ color: 'warning.main', fontSize: '1rem' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
                          {subtasksToDisplay.filter(subtask => subtask.status?.toUpperCase() === 'REVIEWED').length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 500 }}>In Progress</span>
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.2)', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
                          {subtasksToDisplay.filter(subtask => subtask.status?.toUpperCase() === 'APPROVED').length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 500 }}>Completed</span>
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    bgcolor: 'rgba(158, 158, 158, 0.1)', 
                    border: '1px solid rgba(158, 158, 158, 0.2)', 
                    boxShadow: 'none',
                    cursor: inactiveSubtasksCount > 0 ? 'pointer' : 'default',
                    '&:hover': inactiveSubtasksCount > 0 ? {
                      bgcolor: 'rgba(158, 158, 158, 0.15)',
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s ease-in-out'
                    } : {}
                  }}
                  onClick={inactiveSubtasksCount > 0 ? handleViewInactiveSubtasks : undefined}
                >
                  <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <InactiveIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
                          {inactiveSubtasksCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 500 }}>Inactive</span>
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>



        {/* Subtasks Section */}
        <Card sx={{ mt: 0 }}> {/* Removed top margin to match project page compact spacing */}
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Subtasks ({subtasksToDisplay.length})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Reduced gap for tighter layout */}
                <ViewToggle
                  currentView={viewPreferences.subtasks}
                  onViewChange={handleViewChange}
                  disabled={(subtasksLoading || allSubtasksLoading) || subtasksToDisplay.length === 0}
                  size="small"
                />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  size="small"
                  sx={{ 
                    textTransform: 'none',
                    fontSize: '0.75rem', // Smaller font
                    px: 1, // Reduced padding
                    py: 0.4, // Smaller height
                    height: 28, // Fixed small height
                    minWidth: 95, // Consistent width (slightly wider for "Add Subtask")
                  }}
                  onClick={() => setAddSubtaskDialogOpen(true)}
                >
                  Add Subtask
                </Button>
              </Box>
            </Box>
            
            <WorkItemDisplay
              items={paginatedSubtasks}
              itemType="subtask"
              viewType={viewPreferences.subtasks}
              loading={subtasksLoading || allSubtasksLoading}
              onItemClick={handleSubtaskClick}
              onStatusChange={handleSubtaskStatusChange}
              onPriorityChange={handleSubtaskPriorityChange}
              showDescription={false}
              emptyStateProps={{
                show: true,
                icon: <TaskIcon />,
                title: "No subtasks yet",
                description: "Break down this task into smaller subtasks to track progress more effectively.",
                actions: []
              }}
            />
            
            {/* Sticky Pagination for Subtasks */}
            {totalSubtasks > 0 && (
              <LazyPaginationComponent
                currentPage={subtasksCurrentPage}
                totalPages={subtasksTotalPages}
                hasNext={subtasksHasNext}
                hasPrev={subtasksHasPrev}
                startIndex={subtasksStartIndex}
                endIndex={subtasksEndIndex}
                totalItems={totalSubtasks}
                onNext={goToNextSubtasksPage}
                onPrev={goToPrevSubtasksPage}
                itemType="subtasks"
                showPageInfo={true}
                showFirstLast={false}
                variant="sticky"
              />
            )}
          </CardContent>
        </Card>
      </Container>
      
      {/* Add Subtask Dialog */}
      <Dialog 
        open={addSubtaskDialogOpen} 
        onClose={() => setAddSubtaskDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Subtask</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Subtask Title"
              value={newSubtask.title}
              onChange={(e) => handleSubtaskInputChange('title', e.target.value)}
              placeholder="Enter subtask title..."
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newSubtask.description}
              onChange={(e) => handleSubtaskInputChange('description', e.target.value)}
              placeholder="Enter subtask description..."
            />
            
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newSubtask.priority}
                label="Priority"
                onChange={(e) => handleSubtaskInputChange('priority', e.target.value)}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setAddSubtaskDialogOpen(false)}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSubtask}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={creatingSubtask || !newSubtask.title.trim()}
          >
            {creatingSubtask ? 'Creating...' : 'Create Subtask'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteTask}
        title={currentTask?.title || currentTask?.name}
        itemType="Task"
        cascadeWarning="This will permanently delete the task and all its associated subtasks."
        loading={deleting}
      />

      {/* Inactive Subtasks Modal */}
      <InactiveChildItemsModal
        open={inactiveSubtasksModalOpen}
        onClose={() => setInactiveSubtasksModalOpen(false)}
        parentId={taskId}
        parentType="task"
        childType="subtask"
        onWorkItemActivated={handleSubtaskActivated}
      />
    </Box>
  );
};

export default TaskDetailPage;