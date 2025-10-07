import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Breadcrumbs,
  Link,
  Stack,
  LinearProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Task as TaskIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckBox as SubtaskIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Archive as InactiveIcon,
  Home as HomeIcon,
  FolderOpen as ProjectIcon,
  ViewStream as EpicIcon,
  BookmarkBorder as StoryIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  fetchProjects,
  updateStory,
  deleteStory,
} from '../../store/slices/projectsSlice';
import { setViewPreference } from '../../store/slices/uiSlice.js';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import InlineEditableText from '../../components/common/InlineEditableText';
import ExpandableInlineDescription from '../../components/common/ExpandableInlineDescription.jsx';
import ViewToggle from '../../components/common/ViewToggle.jsx';
import WorkItemDisplay from '../../components/common/WorkItemDisplay.jsx';
import DeleteConfirmationDialog from '../../components/common/DeleteConfirmationDialog.jsx';
import StatusDropdown from '../../components/common/StatusDropdown.jsx';
import PriorityDropdown from '../../components/common/PriorityDropdown.jsx';
import LazyPaginationComponent from '../../components/common/LazyPaginationComponent.jsx';
import ExpandableDescription from '../../components/common/ExpandableDescription.jsx';
import ActiveStatusToggle from '../../components/common/ActiveStatusToggle.jsx';
import InactiveChildItemsModal from '../../components/modals/InactiveChildItemsModal.jsx';
import { useLazyPagination } from '../../hooks/useLazyPagination.js';
import { useWorkItem, useProjectWorkItems, useProjectHierarchy } from '../../contexts/ProjectHierarchyContext.jsx';
import { projectsAPI } from '../../services/api/projects';
import { workItemsAPI } from '../../services/api/workItems';

const StoryDetailPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectId, epicId, storyId } = useParams();

  const {
    projects,
  } = useSelector((state) => state.projects);
  
  const { viewPreferences } = useSelector((state) => state.ui);
  
  // Get project from Redux store as additional fallback - handle both string and number IDs
  const projectFromStore = useSelector(state => 
    state.projects.projects.find(p => 
      p.id === projectId || 
      p.id === parseInt(projectId) || 
      p.id?.toString() === projectId
    )
  );

  // Fetch project details directly from API as most reliable source
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (projectId) {
        try {
          const project = await projectsAPI.getProject(projectId);
          setProjectDetails(project);
          console.log('Fetched project details from API (Story page):', project);
        } catch (error) {
          console.error('Failed to fetch project details:', error);
        }
      }
    };
    fetchProjectDetails();
  }, [projectId]);

  // Use hierarchy context for story and its tasks
  const { workItem: currentStory, loading: storyLoading, refetch: refetchStory } = useWorkItem(projectId, storyId);
  const { workItem: currentEpic, loading: epicLoading } = useWorkItem(projectId, epicId);
  const { workItem: currentProject } = useWorkItem(projectId, projectId);
  const { workItems: storyTasks, loading: tasksLoading, refetch: refetchTasks } = useProjectWorkItems(projectId, 'task', storyId);
  const { fetchHierarchy } = useProjectHierarchy();
  
  // Get stories from the current epic for story lookup
  const epicStories = currentEpic?.children?.filter(child => child.type === 'story') || [];
  
  // Also get tasks directly from the current story's children as fallback
  const directStoryTasks = currentStory?.children?.filter(child => child.type === 'task') || [];
  
  // Use the tasks from hierarchy hook, or fallback to direct children
  // Filter to only show active tasks in the main table
  const allTasks = storyTasks.length > 0 ? storyTasks : directStoryTasks;
  const tasksToDisplay = allTasks.filter(task => task.active !== false);

  // Pagination for tasks
  const {
    currentPage: tasksCurrentPage,
    pageSize: tasksPageSize,
    totalPages: tasksTotalPages,
    currentItems: paginatedTasks,
    hasNext: tasksHasNext,
    hasPrev: tasksHasPrev,
    startIndex: tasksStartIndex,
    endIndex: tasksEndIndex,
    totalItems: totalTasks,
    goToNextPage: goToNextTasksPage,
    goToPrevPage: goToPrevTasksPage,
    resetPagination: resetTasksPagination,
  } = useLazyPagination(tasksToDisplay, 5, 1);
  
  // Get all subtasks for counting  
  const { workItems: allSubtasks, loading: subtasksLoading } = useProjectWorkItems(projectId, 'subtask');
  
  console.log('StoryDetailPage data loaded:');
  console.log('- allSubtasks:', allSubtasks);
  console.log('- allSubtasks.length:', allSubtasks?.length);
  console.log('- subtasksLoading:', subtasksLoading);
  console.log('- tasksToDisplay:', tasksToDisplay);
  console.log('- tasksToDisplay.length:', tasksToDisplay?.length);

  const [project, setProject] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);

  // Add Task Dialog State
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  // Inactive Tasks Modal State
  const [inactiveTasksModalOpen, setInactiveTasksModalOpen] = useState(false);
  const [inactiveTasksCount, setInactiveTasksCount] = useState(0);

  // Fetch inactive tasks count when component loads
  useEffect(() => {
    fetchInactiveTasksCount();
  }, [storyId]);

  // Use current story from hierarchy context
  const displayStory = currentStory;

  // Handler for story title update
  const handleStoryTitleUpdate = async (newTitle) => {
    if (!newTitle.trim() || !displayStory || newTitle === displayStory.title) {
      return;
    }

    setUpdating(true);
    try {
      const updateData = { title: newTitle };
      
      await dispatch(updateStory({
        id: displayStory.id,
        data: updateData,
        projectId
      })).unwrap();
      
      // If current status is AI Generated, change to In Review using separate status update
      if (displayStory.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(displayStory.id, 'IN_REVIEW');
        console.log('Story status updated from AI_GENERATED to IN_REVIEW');
        // Refresh story data to show updated status
        if (refetchStory) await refetchStory();
      }
      
      toast.success('Story title updated successfully');
    } catch (error) {
      console.error('Failed to update story title:', error);
      toast.error('Failed to update story title');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  // Handler for story description update
  const handleStoryDescriptionUpdate = async (newDescription) => {
    if (newDescription === (displayStory.description || '')) {
      return;
    }

    setUpdating(true);
    try {
      const updateData = { description: newDescription };
      
      await dispatch(updateStory({
        id: displayStory.id,
        data: updateData,
        projectId
      })).unwrap();
      
      // If current status is AI Generated, change to In Review using separate status update
      if (displayStory.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(displayStory.id, 'IN_REVIEW');
        console.log('Story status updated from AI_GENERATED to IN_REVIEW');
        // Refresh story data to show updated status
        if (refetchStory) await refetchStory();
      }
      
      toast.success('Story description updated successfully');
    } catch (error) {
      console.error('Failed to update story description:', error);
      toast.error('Failed to update story description');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!displayStory) return;

    setDeleting(true);
    try {
      await dispatch(deleteStory(displayStory.id)).unwrap();
      toast.success('Story deleted successfully');
      navigate(`/projects/${projectId}/epics/${epicId}`);
    } catch (error) {
      console.error('Failed to delete story:', error);
      toast.error('Failed to delete story');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    console.log('StoryDetailPage params:', { projectId, epicId, storyId });
    if (projectId) {
      dispatch(fetchProjects());
      // Story, epic, and tasks are now loaded automatically by hierarchy context
    } else {
      console.warn('Missing required parameters:', { projectId, epicId, storyId });
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    if (projects && projects.length > 0 && projectId) {
      const foundProject = projects.find(p => p.id === parseInt(projectId));
      setProject(foundProject);
      console.log('Found project:', foundProject);
    }
  }, [projects, projectId]);

  // Debug current epic loading
  useEffect(() => {
    console.log('=== Epic Debug ===');
    console.log('currentEpic from hierarchy:', currentEpic);
    console.log('epicLoading:', epicLoading);
  }, [currentEpic, epicLoading]);

  // Debug current story loading  
  useEffect(() => {
    console.log('=== Story Debug ===');
    console.log('currentStory from hierarchy:', currentStory);
    console.log('storyLoading:', storyLoading);
    console.log('displayStory:', displayStory);
  }, [currentStory, storyLoading, displayStory]);

  // Debug tasks loading
  useEffect(() => {
    console.log('=== Tasks Debug ===');
    console.log('storyTasks from hierarchy hook:', storyTasks);
    console.log('directStoryTasks from story.children:', directStoryTasks);
    console.log('tasksToDisplay (final):', tasksToDisplay);
    console.log('tasksLoading:', tasksLoading);
    console.log('currentStory:', currentStory);
    
    // If no tasks found after loading, log additional debug info
    if (!tasksLoading && tasksToDisplay.length === 0 && currentStory) {
      console.log('=== No Tasks Found Debug ===');
      console.log('Story found:', currentStory);
      console.log('Story ID for tasks lookup:', storyId);
      console.log('Story has children:', currentStory.children?.length || 0);
      console.log('Story children:', currentStory.children);
    }
  }, [storyId, storyTasks, tasksLoading, currentStory]);

  const handleTaskClick = (task) => {
    // Navigate to task detail page using the optimized approach
    console.log('🔗 Navigating to task:', task);
    console.log('🔗 Task ID:', task.id, 'Type:', typeof task.id);
    
    if (!task || !task.id) {
      console.error('❌ Cannot navigate: Task or task ID is missing');
      toast.error('Cannot open task: Missing task information');
      return;
    }
    
    const navigationUrl = `/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${task.id}`;
    console.log('🔗 Navigation URL:', navigationUrl);
    navigate(navigationUrl);
  };

  const handleViewChange = (newView) => {
    dispatch(setViewPreference({ itemType: 'tasks', view: newView }));
  };

  // Add Task Dialog Handlers
  const handleOpenAddTaskDialog = () => {
    setAddTaskDialogOpen(true);
  };

  const handleCloseAddTaskDialog = () => {
    setAddTaskDialogOpen(false);
    setNewTaskData({ title: '', description: '', priority: 'medium' });
  };

  const handleTaskDataChange = (field, value) => {
    setNewTaskData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTask = async () => {
    if (!newTaskData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setAddingTask(true);
    try {
      const taskData = {
        title: newTaskData.title.trim(),
        description: newTaskData.description.trim() || '',
        item_type: 'task',
        priority: newTaskData.priority,
        project_id: projectId, // Required by WorkItemCreate schema
        parent_id: storyId, // Don't parse as int, keep as string (UUID)
        acceptance_criteria: null,
        estimated_hours: null,
        order_index: 0
      };

      console.log('Creating task with data:', taskData);
      console.log('Project ID:', projectId, 'Story ID:', storyId);

      await projectsAPI.createWorkItem(projectId, taskData);
      toast.success('Task added successfully');
      handleCloseAddTaskDialog();
      
      // Refresh the tasks list to show the new task
      refetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    } finally {
      setAddingTask(false);
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

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo': return <ScheduleIcon fontSize="small" />;
      case 'in progress': return <TaskIcon fontSize="small" />;
      case 'done': return <CheckCircleIcon fontSize="small" />;
      default: return <ScheduleIcon fontSize="small" />;
    }
  };

  // Fetch inactive tasks count
  const fetchInactiveTasksCount = async () => {
    if (!storyId) return;
    try {
      const response = await workItemsAPI.getInactiveChildWorkItems(storyId, 'task');
      setInactiveTasksCount(response?.length || 0);
    } catch (err) {
      setInactiveTasksCount(0);
    }
  };

  // Inactive Tasks Modal Handlers
  const handleViewInactiveTasks = () => {
    setInactiveTasksModalOpen(true);
  };

  const handleCloseInactiveTasksModal = () => {
    setInactiveTasksModalOpen(false);
  };

  const handleTaskActivated = (taskId) => {
    refetchTasks();
    fetchInactiveTasksCount();
    // Toast message is already shown by the modal component
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await projectsAPI.updateWorkItem(taskId, { status: newStatus });
      toast.success('Task status updated successfully');
      // Only refresh the project hierarchy without full page refresh
      await fetchHierarchy(projectId, true);
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleTaskPriorityChange = async (taskId, newPriority) => {
    try {
      await projectsAPI.updateWorkItem(taskId, { priority: newPriority });
      toast.success('Task priority updated successfully');
      // Only refresh the project hierarchy without full page refresh
      await fetchHierarchy(projectId, true);
    } catch (error) {
      console.error('Failed to update task priority:', error);
      toast.error('Failed to update task priority');
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

  const calculateTaskProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => 
      task.status?.toLowerCase() === 'done'
    ).length;
    return (completedTasks / tasks.length) * 100;
  };

  const getStorySubtasksCount = () => {
    console.log('=== Story Subtasks Count Debug ===');
    console.log('subtasksLoading:', subtasksLoading);
    console.log('allSubtasks:', allSubtasks);
    console.log('allSubtasks type:', typeof allSubtasks);
    console.log('allSubtasks.length:', allSubtasks?.length);
    console.log('tasksToDisplay:', tasksToDisplay);
    console.log('tasksToDisplay.length:', tasksToDisplay?.length);
    
    // Return 0 if still loading or no data
    if (subtasksLoading || !allSubtasks || !Array.isArray(allSubtasks) || !tasksToDisplay || tasksToDisplay.length === 0) {
      console.log('Early return: loading or no data');
      return 0;
    }
    
    // Get all task IDs from this story
    const taskIds = tasksToDisplay.map(task => task.id);
    console.log('All taskIds from story:', taskIds);
    
    // Show all subtasks data for debugging
    console.log('All subtasks data:');
    allSubtasks.forEach(subtask => {
      console.log(`  Subtask ${subtask.id}: parent_id=${subtask.parent_id} (type: ${typeof subtask.parent_id})`);
    });
    
    // Count subtasks that belong to these tasks - handle both string and number IDs
    const matchingSubtasks = allSubtasks.filter(subtask => {
      const matches = taskIds.some(taskId => {
        const match1 = subtask.parent_id === taskId;
        const match2 = subtask.parent_id?.toString() === taskId?.toString();
        if (match1 || match2) {
          console.log(`✓ Subtask ${subtask.id} matches task ${subtask.parent_id} (taskId: ${taskId})`);
        }
        return match1 || match2;
      });
      return matches;
    });
    
    console.log('Matching subtasks:', matchingSubtasks);
    console.log('Final story subtasks count:', matchingSubtasks.length);
    return matchingSubtasks.length;
  };

  // Show loading if we don't have the required parameters
  if (!projectId || !epicId || !storyId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="text.secondary">
          Invalid story URL
        </Typography>
      </Box>
    );
  }

  // Show loading if data is still being fetched
  if (storyLoading || epicLoading || tasksLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <LoadingSpinner size={40} />
      </Box>
    );
  }

  console.log('=== Render Check ===');
  console.log('displayStory (currentStory):', displayStory);
  console.log('storyTasks available:', storyTasks?.length || 0);
  console.log('tasksToDisplay available:', tasksToDisplay?.length || 0);

  // If we still don't have a story but it's still loading, show loading
  if (!displayStory && storyLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <LoadingSpinner size={40} />
      </Box>
    );
  }

  // If we can't find the story after loading completed, show not found
  if (!displayStory) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <LoadingSpinner size={40} />
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                verticalAlign: 'top',
                lineHeight: 1.5,
                '&:hover': { 
                  textDecoration: 'underline',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  px: 0.5
                }
              }}
            >
              <HomeIcon sx={{ fontSize: '0.85rem' }} />
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                verticalAlign: 'top',
                lineHeight: 1.5,
                '&:hover': { 
                  textDecoration: 'underline',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  px: 0.5
                }
              }}
            >
              <ProjectIcon sx={{ fontSize: '0.85rem' }} />
              Projects
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}`)}
              title={`Project: ${projectDetails?.name || projectDetails?.title || currentProject?.title || currentProject?.name || project?.title || project?.name || projectFromStore?.name || projectFromStore?.title || 'Project'}`}
              sx={{ 
                cursor: 'pointer', 
                textDecoration: 'none', 
                color: 'primary.main', 
                fontSize: '0.9rem',
                maxWidth: '170px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                verticalAlign: 'top',
                lineHeight: 1.5,
                '&:hover': { 
                  textDecoration: 'underline',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  px: 0.5
                }
              }}
            >
              <ProjectIcon sx={{ fontSize: '0.85rem' }} />
              {projectDetails?.name || projectDetails?.title || currentProject?.title || currentProject?.name || project?.title || project?.name || projectFromStore?.name || projectFromStore?.title || 'Project'}
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}/epics/${epicId}`)}
              title={`Epic: ${currentEpic?.title || currentEpic?.name || displayStory?.epicName || displayStory?.epic_name || 'Epic'}`}
              sx={{ 
                cursor: 'pointer', 
                textDecoration: 'none', 
                color: 'primary.main', 
                fontSize: '0.9rem',
                maxWidth: '170px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                verticalAlign: 'top',
                lineHeight: 1.5,
                '&:hover': { 
                  textDecoration: 'underline',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  px: 0.5
                }
              }}
            >
              <EpicIcon sx={{ fontSize: '0.85rem' }} />
              {currentEpic?.title || currentEpic?.name || displayStory?.epicName || displayStory?.epic_name || 'Epic'}
            </Link>
            <Chip
              icon={<StoryIcon sx={{ fontSize: '0.85rem' }} />}
              label={displayStory?.title || displayStory?.name || 'Untitled Story'}
              title={`Story: ${displayStory?.title || displayStory?.name || 'Untitled Story'}`}
              sx={{ 
                fontSize: '0.9rem',
                fontWeight: 600,
                maxWidth: '240px',
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                },
                '&:hover': {
                  bgcolor: 'secondary.dark'
                }
              }}
            />
          </Breadcrumbs>

          {/* Compact Story Header */}
          <Paper sx={{ p: 1, mb: 0.5, borderRadius: 1, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{
                    width: 28, // Further reduced size
                    height: 28, // Further reduced size
                    bgcolor: 'primary.main',
                    fontSize: '0.8rem', // Further reduced font size
                    fontWeight: 600,
                  }}
                >
                  {displayStory.key || 'S'}
                </Avatar>
                <InlineEditableText
                  value={displayStory.title || displayStory.name || ''}
                  onSave={handleStoryTitleUpdate}
                  variant="h6" // Further reduced from h4
                  color="text.primary"
                  placeholder="Click to edit story title"
                  maxLength={100}
                  loading={updating}
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.1rem', // Further reduced font size
                    '&:hover': { 
                      bgcolor: 'action.hover',
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatusDropdown
                  workItemId={displayStory.id}
                  currentStatus={displayStory.status}
                  onStatusChange={(newStatus) => {
                    console.log('Story status updated to:', newStatus);
                  }}
                  size="medium"
                  variant="chip"
                />
                <PriorityDropdown
                  workItemId={displayStory.id}
                  currentPriority={displayStory.priority}
                  onPriorityChange={async (newPriority) => {
                    console.log('Story priority updated to:', newPriority);
                    // Refresh story data when priority is changed
                    if (refetchStory) await refetchStory();
                  }}
                  size="small"
                  variant="chip"
                />
                <ActiveStatusToggle
                  itemType="story"
                  itemId={displayStory.id}
                  itemTitle={displayStory.title || displayStory.name || 'Story'}
                  currentStatus={displayStory.active}
                  onStatusChange={async (itemId, newStatus) => {
                    try {
                      // Update the current story via API call
                      await projectsAPI.toggleWorkItemActiveStatus(itemId, { active: newStatus });
                      
                      // Refresh the project hierarchy to update parent pages
                      fetchHierarchy(projectId, true);
                      
                      if (newStatus) {
                        // If reactivating, refetch story data to get updated state
                        if (refetchStory) refetchStory();
                      } else {
                        // If deactivating, redirect to parent epic (toast handled by ActiveStatusToggle)
                        navigate(`/projects/${projectId}/epics/${epicId}`);
                      }
                    } catch (error) {
                      console.error('Failed to toggle story status:', error);
                      throw error; // Re-throw to let ActiveStatusToggle handle the error
                    }
                  }}
                  sx={{ ml: 2 }}
                />
              </Box>
            </Box>

            {/* Expandable Description Section */}
            <Box sx={{ mt: 0.5 }}>
              <ExpandableInlineDescription
                value={currentStory.description || ""}
                onSave={handleStoryDescriptionUpdate}
                field="description"
                placeholder="Click to add a description for this story"
                maxLength={2000}
                loading={updating}
                sx={{
                  fontSize: '0.75rem',
                  '& .MuiTypography-root': {
                    fontSize: '0.75rem',
                  },
                }}
              />
            </Box>
          </Paper>

          {/* Ultra-Compact Story Stats (now in same sticky section) */}
          <Grid container spacing={1} sx={{ mb: 0, mt: 2 }}> {/* No margin below stats cards, added top margin for compact look */}
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', boxShadow: 'none' }}>
                <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                    <TaskIcon sx={{ color: 'success.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                        {tasksToDisplay?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                        <span style={{ fontSize: '1rem', fontWeight: 500 }}>Total Tasks</span>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)', border: '1px solid rgba(156, 39, 176, 0.2)', boxShadow: 'none' }}>
                <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                    <SubtaskIcon sx={{ color: 'secondary.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                        {allSubtasks?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                        <span style={{ fontSize: '1rem', fontWeight: 500 }}>SubTasks</span>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', boxShadow: 'none' }}>
                <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                    <TaskIcon sx={{ color: 'primary.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                        {tasksToDisplay?.filter(task => task.status?.toLowerCase() !== 'done').length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                        <span style={{ fontSize: '1rem', fontWeight: 500 }}>Pending Tasks</span>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ bgcolor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', boxShadow: 'none' }}>
                <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                    <CheckCircleIcon sx={{ color: 'secondary.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                        {tasksToDisplay?.filter(task => task.status?.toLowerCase() === 'done').length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                        <span style={{ fontSize: '1rem', fontWeight: 500 }}>Completed Tasks</span>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ bgcolor: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.2)', boxShadow: 'none' }}>
                <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                    <TaskIcon sx={{ color: 'warning.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                        {Math.round(calculateTaskProgress(tasksToDisplay || []))}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                        <span style={{ fontSize: '1rem', fontWeight: 500 }}>Progress</span>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card 
                sx={{ 
                  bgcolor: 'rgba(158, 158, 158, 0.1)', 
                  border: '1px solid rgba(158, 158, 158, 0.2)', 
                  boxShadow: 'none',
                  cursor: inactiveTasksCount > 0 ? 'pointer' : 'default',
                  '&:hover': inactiveTasksCount > 0 ? {
                    bgcolor: 'rgba(158, 158, 158, 0.15)',
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease-in-out'
                  } : {}
                }}
                onClick={inactiveTasksCount > 0 ? handleViewInactiveTasks : undefined}
              >
                <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                    <InactiveIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} /> {/* Smaller icon */}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                        {inactiveTasksCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                        <span style={{ fontSize: '1rem', fontWeight: 500 }}>Inactive</span>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>



        {/* Tasks Section */}
        <Card sx={{ mt: 0 }}> {/* Removed top margin to match project page compact spacing */}
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Tasks ({tasksToDisplay?.length || 0})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Reduced gap for tighter layout */}
                <ViewToggle
                  currentView={viewPreferences.tasks}
                  onViewChange={handleViewChange}
                  disabled={tasksLoading || !tasksToDisplay || tasksToDisplay.length === 0}
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
                    minWidth: 85, // Consistent width
                  }}
                  onClick={handleOpenAddTaskDialog}
                >
                  Add Task
                </Button>
              </Box>
            </Box>

            <WorkItemDisplay
              items={paginatedTasks || []}
              itemType="task"
              viewType={viewPreferences.tasks}
              loading={tasksLoading}
              onItemClick={handleTaskClick}
              onStatusChange={handleTaskStatusChange}
              onPriorityChange={handleTaskPriorityChange}
              showDescription={false}
              emptyStateProps={{
                show: true,
                icon: <TaskIcon />,
                title: "No tasks yet",
                description: "Break down this story into smaller tasks to get started",
                actions: []
              }}
            />
            
            {/* Sticky Pagination for Tasks */}
            {totalTasks > 0 && (
              <LazyPaginationComponent
                currentPage={tasksCurrentPage}
                totalPages={tasksTotalPages}
                hasNext={tasksHasNext}
                hasPrev={tasksHasPrev}
                startIndex={tasksStartIndex}
                endIndex={tasksEndIndex}
                totalItems={totalTasks}
                onNext={goToNextTasksPage}
                onPrev={goToPrevTasksPage}
                itemType="tasks"
                showPageInfo={true}
                showFirstLast={false}
                variant="sticky"
              />
            )}
          </CardContent>
        </Card>
      </Container>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteStory}
        title={displayStory?.title || displayStory?.name}
        itemType="Story"
        cascadeWarning="This will permanently delete the story and all its associated tasks and subtasks."
        loading={deleting}
      />

      {/* Add Task Dialog */}
      <Dialog 
        open={addTaskDialogOpen} 
        onClose={handleCloseAddTaskDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TaskIcon color="primary" />
            Add New Task
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Task Title"
              value={newTaskData.title}
              onChange={(e) => handleTaskDataChange('title', e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Description"
              value={newTaskData.description}
              onChange={(e) => handleTaskDataChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTaskData.priority}
                label="Priority"
                onChange={(e) => handleTaskDataChange('priority', e.target.value)}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCloseAddTaskDialog}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddTask}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={addingTask || !newTaskData.title.trim()}
          >
            {addingTask ? 'Adding...' : 'Add Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inactive Tasks Modal */}
      <InactiveChildItemsModal
        open={inactiveTasksModalOpen}
        onClose={() => setInactiveTasksModalOpen(false)}
        parentId={storyId}
        parentType="story"
        childType="task"
        onWorkItemActivated={handleTaskActivated}
      />
    </Box>
  );
};

export default StoryDetailPage;