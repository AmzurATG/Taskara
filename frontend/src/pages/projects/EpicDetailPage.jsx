import React, { useEffect, useState, useMemo } from 'react';
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
  BookmarkBorder as StoryIcon,
  Task as TaskIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckBox as SubtaskIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Archive as InactiveIcon,
  Home as HomeIcon,
  FolderOpen as ProjectIcon,
  ViewStream as EpicIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
  fetchProject,
  clearCurrentEpic,
  clearProjectsError,
  updateEpic,
  deleteEpic
} from '../../store/slices/projectsSlice.js';
import { setViewPreference } from '../../store/slices/uiSlice.js';
import InlineEditableText from '../../components/common/InlineEditableText.jsx';
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

const EpicDetailPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectId, epicId } = useParams();
  const { 
    currentProject,
    projectsError 
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
          console.log('Fetched project details from API:', project);
        } catch (error) {
          console.error('Failed to fetch project details:', error);
        }
      }
    };
    fetchProjectDetails();
  }, [projectId]);

  // Use hierarchy context for epic and its work items (stories and tasks)
  const { workItem: currentEpic, loading: epicLoading, refetch: refetchEpic } = useWorkItem(projectId, epicId);
  const { workItems: stories, loading: storiesLoading, refetch: refetchStories } = useProjectWorkItems(projectId, 'story', epicId);
  const { workItems: tasks, loading: tasksLoading, refetch: refetchTasks } = useProjectWorkItems(projectId, 'task', epicId);
  const { fetchHierarchy } = useProjectHierarchy();

  // Combine stories and tasks into work items array
  const workItems = useMemo(() => {
    const combined = [...(stories || []), ...(tasks || [])];
    return combined.sort((a, b) => {
      // Sort by creation date or order_index
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  }, [stories, tasks]);

  const workItemsLoading = storiesLoading || tasksLoading;
  
  // Pagination for work items (stories and tasks)
  const {
    currentPage: workItemsCurrentPage,
    pageSize: workItemsPageSize,
    totalPages: workItemsTotalPages,
    currentItems: paginatedWorkItems,
    hasNext: workItemsHasNext,
    hasPrev: workItemsHasPrev,
    startIndex: workItemsStartIndex,
    endIndex: workItemsEndIndex,
    totalItems: totalWorkItems,
    goToNextPage: goToNextWorkItemsPage,
    goToPrevPage: goToPrevWorkItemsPage,
    resetPagination: resetWorkItemsPagination,
  } = useLazyPagination(workItems, 5, 1);
  
  // Get all subtasks for counting
  const { workItems: allSubtasks, loading: subtasksLoading } = useProjectWorkItems(projectId, 'subtask');
  
  const [tabValue, setTabValue] = useState(0);
  const [updating, setUpdating] = useState({
    title: false,
    description: false
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [projectDetails, setProjectDetails] = useState(null);

  // Add Work Item Dialog State
  const [addWorkItemDialogOpen, setAddWorkItemDialogOpen] = useState(false);
  const [addingWorkItem, setAddingWorkItem] = useState(false);
  const [newWorkItemData, setNewWorkItemData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    type: 'story' // Default to story, can be 'story' or 'task'
  });

  // Inactive Stories Modal State
  const [inactiveStoriesModalOpen, setInactiveStoriesModalOpen] = useState(false);
  const [inactiveStoriesCount, setInactiveStoriesCount] = useState(0);

  // Fetch inactive stories count when component loads
  useEffect(() => {
    fetchInactiveStoriesCount();
  }, [epicId]);

  // Handlers for inline editing
  const handleEpicTitleUpdate = async (newTitle) => {
    if (!newTitle.trim() || newTitle === currentEpic.title) {
      return;
    }

    setUpdating(prev => ({ ...prev, title: true }));
    try {
      const updateData = { title: newTitle };
      
      await dispatch(updateEpic({
        id: currentEpic.id,
        data: updateData,
        projectId
      })).unwrap();
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentEpic.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentEpic.id, 'IN_REVIEW');
        console.log('Epic status updated from AI_GENERATED to IN_REVIEW');
        // Add small delay to ensure API call is processed
        await new Promise(resolve => setTimeout(resolve, 100));
        // Refresh epic data to show updated status
        if (refetchEpic) await refetchEpic();
        // Also refresh the project hierarchy to update all cached data
        await fetchHierarchy(projectId, true);
        // Force component re-render
        setRefreshTrigger(prev => prev + 1);
        console.log('Epic data refreshed after status change');
        console.log('Current epic status after refresh:', currentEpic.status);
        // If the above doesn't work, you can try uncommenting the next line:
        // setTimeout(() => window.location.reload(), 500);
      }
      
      toast.success('Epic title updated successfully');
    } catch (error) {
      console.error('Failed to update epic title:', error);
      toast.error('Failed to update epic title');
      throw error;
    } finally {
      setUpdating(prev => ({ ...prev, title: false }));
    }
  };

  const handleEpicDescriptionUpdate = async (newDescription) => {
    if (newDescription === currentEpic.description) {
      return;
    }

    setUpdating(prev => ({ ...prev, description: true }));
    try {
      const updateData = { description: newDescription };
      
      await dispatch(updateEpic({
        id: currentEpic.id,
        data: updateData,
        projectId
      })).unwrap();
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentEpic.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentEpic.id, 'IN_REVIEW');
        console.log('Epic status updated from AI_GENERATED to IN_REVIEW');
        // Add small delay to ensure API call is processed
        await new Promise(resolve => setTimeout(resolve, 100));
        // Refresh epic data to show updated status
        if (refetchEpic) await refetchEpic();
        // Also refresh the project hierarchy to update all cached data
        await fetchHierarchy(projectId, true);
        // Force component re-render
        setRefreshTrigger(prev => prev + 1);
        console.log('Epic data refreshed after status change');
        console.log('Current epic status after refresh:', currentEpic.status);
        // If the above doesn't work, you can try uncommenting the next line:
        // setTimeout(() => window.location.reload(), 500);
      }
      
      toast.success('Epic description updated successfully');
    } catch (error) {
      console.error('Failed to update epic description:', error);
      toast.error('Failed to update epic description');
      throw error;
    } finally {
      setUpdating(prev => ({ ...prev, description: false }));
    }
  };

  const handleDeleteEpic = async () => {
    if (!currentEpic) return;

    setDeleting(true);
    try {
      await dispatch(deleteEpic(currentEpic.id)).unwrap();
      toast.success('Epic deleted successfully');
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to delete epic:', error);
      toast.error('Failed to delete epic');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProject(projectId));
    }
    // Epic and stories are now loaded automatically by hierarchy context
    
    return () => {
      dispatch(clearCurrentEpic());
      dispatch(clearProjectsError());
    };
  }, [dispatch, projectId]);

  useEffect(() => {
    if (projectsError) {
      toast.error(projectsError);
    }
  }, [projectsError]);

  const handleBackToProject = () => {
    navigate(`/projects/${projectId}`);
  };

  const handleWorkItemClick = (workItem) => {
    console.log('=== Work Item Click Debug ===');
    console.log('Clicked work item:', workItem);
    console.log('Current URL params:', { projectId, epicId });
    console.log('Work item ID:', workItem.id);
    console.log('Work item type:', workItem.item_type || workItem.type);
    
    const itemType = workItem.item_type || workItem.type;
    let navigationUrl;
    
    if (itemType === 'story') {
      navigationUrl = `/projects/${projectId}/epics/${epicId}/stories/${workItem.id}`;
    } else if (itemType === 'task') {
      navigationUrl = `/projects/${projectId}/epics/${epicId}/tasks/${workItem.id}`;
    } else {
      console.error('Unknown work item type:', itemType);
      return;
    }
    
    console.log('Navigation URL:', navigationUrl);
    
    try {
      console.log('Attempting navigation...');
      navigate(navigationUrl);
      console.log('Navigation command executed');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleViewChange = (newView) => {
    dispatch(setViewPreference({ itemType: 'stories', view: newView }));
  };

  const handleStoryStatusChange = async (storyId, newStatus) => {
    try {
      await projectsAPI.updateWorkItem(storyId, { status: newStatus });
      toast.success('Story status updated successfully');
      // Only refresh the project hierarchy without full page refresh
      await fetchHierarchy(projectId, true);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update story status:', error);
      toast.error('Failed to update story status');
    }
  };

  const handleStoryPriorityChange = async (storyId, newPriority) => {
    try {
      await projectsAPI.updateWorkItem(storyId, { priority: newPriority });
      toast.success('Story priority updated successfully');
      // Only refresh the project hierarchy without full page refresh
      await fetchHierarchy(projectId, true);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update story priority:', error);
      toast.error('Failed to update story priority');
    }
  };

  // Add Work Item Dialog Handlers
  const handleOpenAddWorkItemDialog = () => {
    setAddWorkItemDialogOpen(true);
  };

  const handleCloseAddWorkItemDialog = () => {
    setAddWorkItemDialogOpen(false);
    setNewWorkItemData({ title: '', description: '', priority: 'medium', type: 'story' });
  };

  const handleWorkItemDataChange = (field, value) => {
    setNewWorkItemData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddWorkItem = async () => {
    if (!newWorkItemData.title.trim()) {
      toast.error('Work item title is required');
      return;
    }

    setAddingWorkItem(true);
    try {
      const workItemData = {
        title: newWorkItemData.title.trim(),
        description: newWorkItemData.description.trim() || '',
        item_type: newWorkItemData.type,
        priority: newWorkItemData.priority,
        project_id: projectId, // Required by WorkItemCreate schema
        parent_id: epicId, // Don't parse as int, keep as string (UUID)
        acceptance_criteria: null,
        estimated_hours: null,
        order_index: 0
      };

      console.log('Creating work item with data:', workItemData);
      console.log('Project ID:', projectId, 'Epic ID:', epicId);

      await projectsAPI.createWorkItem(projectId, workItemData);
      toast.success(`${newWorkItemData.type === 'story' ? 'Story' : 'Task'} added successfully`);
      handleCloseAddWorkItemDialog();
      
      // Refresh the work items lists to show the new work item
      if (newWorkItemData.type === 'story') {
        refetchStories();
      } else {
        refetchTasks();
      }
      
      // Also refresh the entire hierarchy cache to ensure persistence across navigation
      fetchHierarchy(projectId, true);
    } catch (error) {
      console.error('Error adding work item:', error);
      toast.error('Failed to add work item');
    } finally {
      setAddingWorkItem(false);
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

  // Fetch inactive stories count
  const fetchInactiveStoriesCount = async () => {
    if (!epicId) return;
    try {
      const response = await workItemsAPI.getInactiveChildWorkItems(epicId, 'story');
      setInactiveStoriesCount(response?.length || 0);
    } catch (err) {
      setInactiveStoriesCount(0);
    }
  };

  // Inactive Stories Modal Handlers
  const handleViewInactiveStories = () => {
    setInactiveStoriesModalOpen(true);
  };

  const handleCloseInactiveStoriesModal = () => {
    setInactiveStoriesModalOpen(false);
  };

  const handleWorkItemActivated = (workItemId) => {
    refetchStories();
    refetchTasks();
    fetchInactiveStoriesCount();
    // Also refresh the entire hierarchy cache to ensure persistence across navigation
    fetchHierarchy(projectId, true);
    // Toast message is already shown by the modal component
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

  const calculateStoryProgress = (story) => {
    // Get tasks for this specific story from the hierarchy
    const storyTasks = story.children?.filter(child => child.type === 'task') || [];
    if (storyTasks.length === 0) return 0;
    const completedTasks = storyTasks.filter(task => task.status?.toLowerCase() === 'done').length;
    return (completedTasks / storyTasks.length) * 100;
  };

  // Filter to only show active stories in the main table
  const epicStories = (stories || []).filter(story => story.active !== false);
  
  console.log('EpicDetailPage data loaded:');
  console.log('- allSubtasks:', allSubtasks);
  console.log('- allSubtasks.length:', allSubtasks?.length);
  console.log('- subtasksLoading:', subtasksLoading);
  console.log('- epicStories:', epicStories);
  console.log('- epicStories.length:', epicStories?.length);
  console.log('- currentProject:', currentProject);
  console.log('- projectFromStore:', projectFromStore);
  if (currentProject) {
    console.log('- currentProject keys:', Object.keys(currentProject));
  }
  if (projectFromStore) {
    console.log('- projectFromStore keys:', Object.keys(projectFromStore));
  }

  // Calculate epic-level statistics
  const getEpicTasksCount = () => {
    if (!epicStories || epicStories.length === 0) return 0;
    return epicStories.reduce((total, story) => {
      const storyTasks = story.children?.filter(child => child.type === 'task') || [];
      return total + storyTasks.length;
    }, 0);
  };

  const getEpicSubtasksCount = () => {
    console.log('=== Epic Subtasks Count Debug ===');
    console.log('subtasksLoading:', subtasksLoading);
    console.log('allSubtasks:', allSubtasks);  
    console.log('allSubtasks type:', typeof allSubtasks);
    console.log('allSubtasks.length:', allSubtasks?.length);
    console.log('epicStories:', epicStories);
    console.log('epicStories.length:', epicStories?.length);
    
    // Return 0 if still loading or no data
    if (subtasksLoading || !allSubtasks || !Array.isArray(allSubtasks) || !epicStories || epicStories.length === 0) {
      console.log('Early return: loading or no data');
      return 0;
    }
    
    // Get all task IDs from this epic's stories
    const taskIds = [];
    epicStories.forEach(story => {
      const storyTasks = story.children?.filter(child => child.type === 'task') || [];
      console.log(`Story ${story.id} has ${storyTasks.length} tasks:`, storyTasks.map(t => t.id));
      taskIds.push(...storyTasks.map(task => task.id));
    });
    
    console.log('All taskIds from epic:', taskIds);
    
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
    console.log('Final epic subtasks count:', matchingSubtasks.length);
    return matchingSubtasks.length;
  };

  if (epicLoading && !currentEpic) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: '200px' }} />
      </Box>
    );
  }

  if (!currentEpic) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Epic not found
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
            onClick={handleBackToProject}
            title={`Project: ${projectDetails?.name || projectDetails?.title || currentProject?.name || currentProject?.title || projectFromStore?.name || projectFromStore?.title || currentEpic?.projectName || currentEpic?.project_name || 'Project'}`}
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
            {projectDetails?.name || projectDetails?.title || currentProject?.name || currentProject?.title || projectFromStore?.name || projectFromStore?.title || currentEpic?.projectName || currentEpic?.project_name || 'Project'}
          </Link>
          <Chip
            icon={<EpicIcon sx={{ fontSize: '0.85rem' }} />}
            label={currentEpic.title || currentEpic.name || 'Untitled Epic'}
            title={`Epic: ${currentEpic.title || currentEpic.name || 'Untitled Epic'}`}
            sx={{ 
              fontSize: '0.9rem',
              fontWeight: 600,
              maxWidth: '240px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              },
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          />
        </Breadcrumbs>

        {/* Compact Epic Header */}
        <Paper sx={{ p: 1, mb: 0.5, borderRadius: 1, boxShadow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 28, // Further reduced size
                  height: 28, // Further reduced size
                  bgcolor: getPriorityColor(currentEpic.priority),
                  fontSize: '0.8rem', // Further reduced font size
                  fontWeight: 600,
                }}
              >
                {currentEpic.key}
              </Avatar>
              <InlineEditableText
                value={currentEpic.title || currentEpic.name || ''}
                onSave={handleEpicTitleUpdate}
                variant="h6" // Further reduced from h5
                color="text.primary"
                placeholder="Click to edit epic title"
                maxLength={100}
                loading={updating.title}
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
                workItemId={currentEpic.id}
                currentStatus={currentEpic.status}
                onStatusChange={async (newStatus) => {
                  // Update local state if needed
                  console.log('Epic status updated to:', newStatus);
                  // Refresh epic data when status is changed via dropdown
                  if (refetchEpic) await refetchEpic();
                  await fetchHierarchy(projectId, true);
                  // Force component re-render
                  setRefreshTrigger(prev => prev + 1);
                }}
                size="medium"
                variant="chip"
                label={currentEpic.status === 'AI_GENERATED' ? 'AI Generated' : currentEpic.status}
              />
              <PriorityDropdown
                workItemId={currentEpic.id}
                currentPriority={currentEpic.priority}
                onPriorityChange={async (newPriority) => {
                  // Update local state if needed
                  console.log('Epic priority updated to:', newPriority);
                  // Refresh epic data when priority is changed via dropdown
                  if (refetchEpic) await refetchEpic();
                  await fetchHierarchy(projectId, true);
                  // Force component re-render
                  setRefreshTrigger(prev => prev + 1);
                }}
                size="small"
                variant="chip"
              />
              <ActiveStatusToggle
                itemType="epic"
                itemId={currentEpic.id}
                itemTitle={currentEpic.title || currentEpic.name || 'Epic'}
                currentStatus={currentEpic.active}
                onStatusChange={async (itemId, newStatus) => {
                  try {
                    // Update the current epic via API call
                    await projectsAPI.toggleWorkItemActiveStatus(itemId, { active: newStatus });
                    
                    // Refresh the project hierarchy to update parent pages
                    fetchHierarchy(projectId, true);
                    
                    if (newStatus) {
                      // If reactivating, refetch epic data to get updated state
                      if (refetchEpic) refetchEpic();
                    } else {
                      // If deactivating, redirect to parent project
                      // Toast message is handled by ActiveStatusToggle component
                      navigate(`/projects/${projectId}`);
                    }
                  } catch (error) {
                    console.error('Failed to toggle epic status:', error);
                    throw error; // Re-throw to let ActiveStatusToggle handle the error
                  }
                }}
                sx={{ ml: 2 }}
              />
            </Box>
          </Box>

          {/* Expandable Inline Description Section */}
          <ExpandableInlineDescription
            title="Description"
            value={currentEpic.description || ''}
            onSave={handleEpicDescriptionUpdate}
            placeholder="Click to add a description for this epic"
            loading={updating.description}
            maxLength={2000}
            containerSx={{ mt: 0.5 }}
          />
        </Paper>

        {/* Ultra-Compact Epic Stats (now in same sticky section) */}
        <Grid container spacing={1} sx={{ mb: 0, mt: 2 }}> {/* No margin below stats cards for compact look */}
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', boxShadow: 'none' }}>
              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                  <StoryIcon sx={{ color: 'success.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {epicStories.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>Total Stories</span>
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
                  <TaskIcon sx={{ color: 'info.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {getEpicTasksCount()}
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
            <Card sx={{ bgcolor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', boxShadow: 'none' }}>
              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                  <CheckCircleIcon sx={{ color: 'primary.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {epicStories.filter(s => s.status?.toLowerCase() === 'done').length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>Completed</span>
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
                  <PlayIcon sx={{ color: 'warning.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {epicStories.filter(s => s.status?.toLowerCase() === 'in progress').length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>In Progress</span>
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
                cursor: inactiveStoriesCount > 0 ? 'pointer' : 'default',
                '&:hover': inactiveStoriesCount > 0 ? {
                  bgcolor: 'rgba(158, 158, 158, 0.15)',
                  transform: 'translateY(-1px)',
                  transition: 'all 0.2s ease-in-out'
                } : {}
              }}
              onClick={inactiveStoriesCount > 0 ? handleViewInactiveStories : undefined}
            >
              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                  <InactiveIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {inactiveStoriesCount}
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



        {/* Compact Stories Section */}
        <Card sx={{ mt: 0 }}> {/* Removed top margin to match project page compact spacing */}
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}> {/* Reduced margin */}
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem' }}> {/* Further reduced font */}
                Work Items ({totalWorkItems})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Reduced gap for tighter layout */}
                <ViewToggle
                  currentView={viewPreferences.stories}
                  onViewChange={handleViewChange}
                  disabled={workItemsLoading || totalWorkItems === 0}
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
                  onClick={handleOpenAddWorkItemDialog}
                >
                  Add Work Item
                </Button>
              </Box>
            </Box>

            <WorkItemDisplay
              items={paginatedWorkItems}
              itemType="mixed"
              viewType={viewPreferences.stories}
              loading={workItemsLoading}
              onItemClick={handleWorkItemClick}
              onStatusChange={handleStoryStatusChange}
              onPriorityChange={handleStoryPriorityChange}
              showDescription={false}
              emptyStateProps={{
                show: totalWorkItems === 0,
                icon: <StoryIcon />,
                description: "Break down this epic into work items to get started",
                actions: []
              }}
            />
            
            {/* Sticky Pagination for Work Items */}
            {totalWorkItems > 0 && (
              <LazyPaginationComponent
                currentPage={workItemsCurrentPage}
                totalPages={workItemsTotalPages}
                hasNext={workItemsHasNext}
                hasPrev={workItemsHasPrev}
                startIndex={workItemsStartIndex}
                endIndex={workItemsEndIndex}
                totalItems={totalWorkItems}
                onNext={goToNextWorkItemsPage}
                onPrev={goToPrevWorkItemsPage}
                itemType="stories"
                showPageInfo={true}
                showFirstLast={false}
                size="small" // Use small size for more compact pagination
                variant="sticky" // Make pagination sticky to bottom of screen
              />
            )}
          </CardContent>
        </Card>
      </Container>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteEpic}
        title={currentEpic?.title || currentEpic?.name}
        itemType="Epic"
        cascadeWarning="This will permanently delete the epic and all its associated stories and tasks."
        loading={deleting}
      />

      {/* Add Story Dialog */}
      <Dialog 
        open={addWorkItemDialogOpen} 
        onClose={handleCloseAddWorkItemDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {newWorkItemData.type === 'story' ? <StoryIcon color="primary" /> : <TaskIcon color="primary" />}
            Add New Work Item
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Work Item Type</InputLabel>
              <Select
                value={newWorkItemData.type}
                label="Work Item Type"
                onChange={(e) => handleWorkItemDataChange('type', e.target.value)}
              >
                <MenuItem value="story">Story</MenuItem>
                <MenuItem value="task">Task</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Work Item Title"
              value={newWorkItemData.title}
              onChange={(e) => handleWorkItemDataChange('title', e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Description"
              value={newWorkItemData.description}
              onChange={(e) => handleWorkItemDataChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newWorkItemData.priority}
                label="Priority"
                onChange={(e) => handleWorkItemDataChange('priority', e.target.value)}
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
            onClick={handleCloseAddWorkItemDialog}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddWorkItem}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={addingWorkItem || !newWorkItemData.title.trim()}
          >
            {addingWorkItem ? 'Adding...' : 'Add Work Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inactive Stories Modal */}
      <InactiveChildItemsModal
        open={inactiveStoriesModalOpen}
        onClose={handleCloseInactiveStoriesModal}
        parentId={epicId}
        parentType="epic"
        childType="story"
        onWorkItemActivated={handleWorkItemActivated}
      />
    </Box>
  );
};

export default EpicDetailPage;