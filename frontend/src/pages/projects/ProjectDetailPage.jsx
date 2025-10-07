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
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Collapse,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  MoreVert as MoreVertIcon,
  ViewStream as EpicIcon,
  BookmarkBorder as StoryIcon,
  Task as TaskIcon,
  CheckBox as SubtaskIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  SmartToy as ChatBotIcon,
  Chat as ChatIcon,
  Upload as UploadIcon,
  Folder as FilesIcon,
  Archive as InactiveIcon,
  Home as HomeIcon,
  FolderOpen as ProjectIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
  fetchProject, 
  updateProject,
  clearCurrentProject,
  updateCurrentProject,
  clearProjectsError 
} from '../../store/slices/projectsSlice.js';
import { setViewPreference } from '../../store/slices/uiSlice.js';
import InlineEditableText from '../../components/common/InlineEditableText.jsx';
import ExpandableInlineDescription from '../../components/common/ExpandableInlineDescription.jsx';
import ViewToggle from '../../components/common/ViewToggle.jsx';
import WorkItemDisplay from '../../components/common/WorkItemDisplay.jsx';
import FileUploadComponent from '../../components/files/FileUploadComponent.jsx';
import ProjectChatBot from '../../components/projects/ProjectChatBot.jsx';
import LazyPaginationComponent from '../../components/common/LazyPaginationComponent.jsx';
import ExpandableDescription from '../../components/common/ExpandableDescription.jsx';
import { useLazyPagination } from '../../hooks/useLazyPagination.js';
import { useProjectWorkItems } from '../../contexts/ProjectHierarchyContext.jsx';
import { projectsAPI } from '../../services/api/projects';
import ActiveStatusToggle from '../../components/common/ActiveStatusToggle.jsx';
import InactiveWorkItemsModal from '../../components/modals/InactiveWorkItemsModal.jsx';

const ProjectDetailPage = () => {
  // Handler for changing view preferences (epics/table or epics/card)
  const handleViewChange = (viewType) => {
    dispatch(setViewPreference({ itemType: 'epics', view: viewType }));
  };
  
  // Get view preferences from Redux state
  const { viewPreferences } = useSelector((state) => state.ui);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { 
    currentProject, 
    projectsLoading, 
    projectsError 
  } = useSelector((state) => state.projects);
  
  // Use the new hierarchy context for work items
  const { workItems: projectEpics, loading: workItemsLoading, error: workItemsError, refetch: refetchEpics } = useProjectWorkItems(
    projectId, 
    'epic' // Only fetch epics for the project page
  );
  
  // Separate active and inactive epics
  const activeEpics = useMemo(() => 
    projectEpics?.filter(epic => epic.active !== false) || [], 
    [projectEpics]
  );
  const inactiveEpics = useMemo(() => 
    projectEpics?.filter(epic => epic.active === false) || [], 
    [projectEpics]
  );
  
  // Lazy pagination for active epics
  const {
    currentPage: epicsCurrentPage,
    pageSize: epicsPageSize,
    totalPages: epicsTotalPages,
    currentItems: paginatedEpics,
    hasNext: epicsHasNext,
    hasPrev: epicsHasPrev,
    startIndex: epicsStartIndex,
    endIndex: epicsEndIndex,
    totalItems: totalEpics,
    goToNextPage: goToNextEpicsPage,
    goToPrevPage: goToPrevEpicsPage,
    goToPage: goToEpicsPage,
    resetPagination: resetEpicsPagination,
  } = useLazyPagination(activeEpics, 5, 1);
  
  // Lazy pagination for inactive epics
  const {
    currentPage: inactiveEpicsCurrentPage,
    pageSize: inactiveEpicsPageSize,
    totalPages: inactiveEpicsTotalPages,
    currentItems: paginatedInactiveEpics,
    hasNext: inactiveEpicsHasNext,
    hasPrev: inactiveEpicsHasPrev,
    startIndex: inactiveEpicsStartIndex,
    endIndex: inactiveEpicsEndIndex,
    totalItems: totalInactiveEpics,
    goToNextPage: goToNextInactiveEpicsPage,
    goToPrevPage: goToPrevInactiveEpicsPage,
    goToPage: goToInactiveEpicsPage,
    resetPagination: resetInactiveEpicsPagination,
  } = useLazyPagination(inactiveEpics, 5, 1);
  
  // Get counts for stories, tasks, and subtasks across the project
  const { workItems: allStories } = useProjectWorkItems(projectId, 'story');
  const { workItems: allTasks } = useProjectWorkItems(projectId, 'task');
  const { workItems: allSubtasks, loading: subtasksLoading } = useProjectWorkItems(projectId, 'subtask');
  
  // Inactive work items count from backend
  const [inactiveItemsCount, setInactiveItemsCount] = useState(0);

  // Fetch inactive work items count from backend
  const fetchInactiveItemsCount = async () => {
    if (!projectId) return;
    try {
      const response = await projectsAPI.getInactiveWorkItems(projectId);
      setInactiveItemsCount(response?.length || 0);
    } catch (err) {
      setInactiveItemsCount(0);
    }
  };

  useEffect(() => {
    fetchInactiveItemsCount();
  }, [projectId]);

  // Also refresh count after activating/deactivating
  const handleWorkItemActivated = (workItemId) => {
    refetchEpics();
    fetchInactiveItemsCount();
    // Toast message is already shown by the modal component
  };
  
  // console.log('ProjectDetailPage data loaded:');
  // console.log('- allSubtasks:', allSubtasks);
  // console.log('- allSubtasks.length:', allSubtasks?.length);
  // console.log('- subtasksLoading:', subtasksLoading);
  // console.log('- allSubtasks type:', typeof allSubtasks);
  // console.log('- projectEpics:', projectEpics);
  // console.log('- first epic data:', projectEpics?.[0]);
  
  const [updating, setUpdating] = useState({ name: false, description: false });

  // Add Epic Dialog State
  const [addEpicDialogOpen, setAddEpicDialogOpen] = useState(false);
  const [addingEpic, setAddingEpic] = useState(false);
  const [newEpicData, setNewEpicData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  // ChatBot Dialog State
  const [chatBotOpen, setChatBotOpen] = useState(false);

  // Files Dialog State
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);

  // Files State
  const [projectFiles, setProjectFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Inactive Work Items Modal State
  const [inactiveWorkItemsModalOpen, setInactiveWorkItemsModalOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProject(projectId));
      // Work items are now loaded automatically by useProjectWorkItems hook
    }
    
    return () => {
      dispatch(clearCurrentProject());
      dispatch(clearProjectsError());
    };
  }, [dispatch, projectId]);

  useEffect(() => {
    if (currentProject) {
      // Project loaded successfully
      console.log('Current project loaded:', currentProject);
    }
  }, [currentProject]);

  useEffect(() => {
    if (projectsError) {
      toast.error(projectsError);
    }
    if (workItemsError) {
      toast.error(workItemsError);
    }
  }, [projectsError, workItemsError]);

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleEpicClick = (epic, event) => {
    if (event) event.stopPropagation();
    navigate(`/projects/${projectId}/epics/${epic.id}`);
  };

  const handleReactivateEpic = async (epic, event) => {
    if (event) event.stopPropagation();
    
    try {
      await projectsAPI.toggleWorkItemActiveStatus(epic.id, { active: true });
      toast.success(`Epic "${epic.title || epic.name}" reactivated successfully`);
      refetchEpics(); // Refresh the epics list
    } catch (error) {
      console.error('Failed to reactivate epic:', error);
      toast.error('Failed to reactivate epic');
    }
  };

  const handleEpicStatusChange = async (epicId, newStatus) => {
    try {
      await projectsAPI.updateWorkItem(epicId, { status: newStatus });
      toast.success('Epic status updated successfully');
      refetchEpics(); // Refresh the epics list
    } catch (error) {
      console.error('Failed to update epic status:', error);
      toast.error('Failed to update epic status');
    }
  };

  const handleEpicPriorityChange = async (epicId, newPriority) => {
    try {
      await projectsAPI.updateWorkItem(epicId, { priority: newPriority });
      toast.success('Epic priority updated successfully');
      refetchEpics(); // Refresh the epics list
    } catch (error) {
      console.error('Failed to update epic priority:', error);
      toast.error('Failed to update epic priority');
    }
  };



  const handleCreateEpic = () => {
    setAddEpicDialogOpen(true);
  };

  const handleOpenChatBot = () => {
    setChatBotOpen(true);
  };

  const handleCloseChatBot = () => {
    setChatBotOpen(false);
  };

  const handleViewFiles = () => {
    setFilesDialogOpen(true);
  };

  const handleCloseFilesDialog = () => {
    setFilesDialogOpen(false);
  };

  // Inactive Work Items Modal Handlers
  const handleViewInactiveWorkItems = () => {
    setInactiveWorkItemsModalOpen(true);
  };

  const handleCloseInactiveWorkItemsModal = () => {
    setInactiveWorkItemsModalOpen(false);
  };

  // (Removed duplicate, see updated version above)

  // Add Epic Dialog Handlers
  const handleCloseAddEpicDialog = () => {
    setAddEpicDialogOpen(false);
    setNewEpicData({ title: '', description: '', priority: 'medium' });
  };

  const handleEpicDataChange = (field, value) => {
    setNewEpicData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddEpic = async () => {
    if (!newEpicData.title.trim()) {
      toast.error('Epic title is required');
      return;
    }

    setAddingEpic(true);
    try {
      const epicData = {
        title: newEpicData.title.trim(),
        description: newEpicData.description.trim() || '',
        item_type: 'epic',
        priority: newEpicData.priority,
        project_id: projectId, // Required by WorkItemCreate schema
        parent_id: null, // Epics don't have parents
        acceptance_criteria: null,
        estimated_hours: null,
        order_index: 0
      };

      console.log('Creating epic with data:', epicData);
      console.log('Project ID:', projectId);

      await projectsAPI.createWorkItem(projectId, epicData);
      toast.success('Epic added successfully');
      handleCloseAddEpicDialog();
      
      // Refresh the epics list to show the new epic
      refetchEpics();
    } catch (error) {
      console.error('Error adding epic:', error);
      toast.error('Failed to add epic');
    } finally {
      setAddingEpic(false);
    }
  };

  const handleProjectNameUpdate = async (newName) => {
    if (!newName.trim()) {
      toast.error('Project name cannot be empty');
      throw new Error('Project name cannot be empty');
    }

    setUpdating(prev => ({ ...prev, name: true }));
    
    try {
      await dispatch(updateProject({
        projectId: currentProject.id,
        projectData: { name: newName }
      })).unwrap();
      
      toast.success('Project name updated successfully');
    } catch (error) {
      toast.error('Failed to update project name');
      throw error;
    } finally {
      setUpdating(prev => ({ ...prev, name: false }));
    }
  };

  const handleProjectDescriptionUpdate = async (newDescription) => {
    setUpdating(prev => ({ ...prev, description: true }));
    
    try {
      await dispatch(updateProject({
        projectId: currentProject.id,
        projectData: { description: newDescription }
      })).unwrap();
      
      toast.success('Project description updated successfully');
    } catch (error) {
      toast.error('Failed to update project description');
      throw error;
    } finally {
      setUpdating(prev => ({ ...prev, description: false }));
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

  // File Management Methods
  const loadProjectFiles = async () => {
    if (!projectId) return;
    
    setFilesLoading(true);
    try {
      const files = await projectsAPI.getProjectFiles(projectId);
      setProjectFiles(files);
    } catch (error) {
      console.error('Failed to load project files:', error);
      toast.error('Failed to load project files');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileUploadComplete = (result) => {
    console.log('File upload completed:', result);
    loadProjectFiles();
    refetchEpics();
  };

  // Export project hierarchy to CSV
  const handleExportProject = async () => {
    try {
      toast.loading('Generating CSV export...', { id: 'export-loading' });
      
      // Fetch all project data including hierarchy
      const [projectData, allEpics] = await Promise.all([
        projectsAPI.getProject(projectId),
        projectsAPI.getProjectEpics(projectId)
      ]);

      // Filter only active work items and build hierarchy
      const activeEpics = allEpics.filter(epic => epic.active !== false);
      
      if (activeEpics.length === 0) {
        toast.warning('No active work items found to export', { id: 'export-loading' });
        return;
      }
      const csvData = [];
      
      // Add CSV headers compatible with Jira import
      csvData.push([
        'Issue Type',
        'Summary',
        'Description', 
        'Priority',
        'Status',
        'Parent Issue',
        'Epic Link',
        'Project Key',
        'Estimated Hours',
        'Created Date'
      ]);

      // Process each epic and its children
      for (const epic of activeEpics) {
        // Add epic row
        csvData.push([
          'Epic',
          epic.title || epic.name || '',
          epic.description || '',
          epic.priority || 'Medium',
          epic.status || 'To Do',
          '', // No parent for epics
          epic.title || epic.name || '', // Epic link is itself
          currentProject.name || 'Project',
          epic.estimated_hours || '',
          epic.created_at ? new Date(epic.created_at).toISOString().split('T')[0] : ''
        ]);

        // Fetch stories for this epic
        try {
          const epicStories = await projectsAPI.getEpicStories(epic.id, projectId);
          const activeStories = epicStories.filter(story => story.active !== false);
          
          for (const story of activeStories) {
            // Add story row
            csvData.push([
              'Story',
              story.title || story.name || '',
              story.description || '',
              story.priority || 'Medium',
              story.status || 'To Do',
              epic.title || epic.name || '', // Parent is epic
              epic.title || epic.name || '', // Epic link
              currentProject.name || 'Project',
              story.estimated_hours || '',
              story.created_at ? new Date(story.created_at).toISOString().split('T')[0] : ''
            ]);

            // Fetch tasks for this story
            try {
              const storyTasks = await projectsAPI.getStoryTasks(story.id, projectId);
              const activeTasks = storyTasks.filter(task => task.active !== false);
              
              for (const task of activeTasks) {
                // Add task row
                csvData.push([
                  'Task',
                  task.title || task.name || '',
                  task.description || '',
                  task.priority || 'Medium',
                  task.status || 'To Do',
                  story.title || story.name || '', // Parent is story
                  epic.title || epic.name || '', // Epic link
                  currentProject.name || 'Project',
                  task.estimated_hours || '',
                  task.created_at ? new Date(task.created_at).toISOString().split('T')[0] : ''
                ]);

                // Fetch subtasks for this task
                try {
                  const taskSubtasks = await projectsAPI.getTaskSubtasks(task.id, projectId);
                  const activeSubtasks = taskSubtasks.filter(subtask => subtask.active !== false);
                  
                  for (const subtask of activeSubtasks) {
                    // Add subtask row
                    csvData.push([
                      'Sub-task',
                      subtask.title || subtask.name || '',
                      subtask.description || '',
                      subtask.priority || 'Medium',
                      subtask.status || 'To Do',
                      task.title || task.name || '', // Parent is task
                      epic.title || epic.name || '', // Epic link
                      currentProject.name || 'Project',
                      subtask.estimated_hours || '',
                      subtask.created_at ? new Date(subtask.created_at).toISOString().split('T')[0] : ''
                    ]);
                  }
                } catch (error) {
                  console.warn(`Failed to fetch subtasks for task ${task.id}:`, error);
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch tasks for story ${story.id}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch stories for epic ${epic.id}:`, error);
        }
      }

      // Convert to CSV format
      const csvContent = csvData.map(row => 
        row.map(field => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escapedField = String(field || '').replace(/"/g, '""');
          return /[",\n\r]/.test(escapedField) ? `"${escapedField}"` : escapedField;
        }).join(',')
      ).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${currentProject.name || 'project'}_hierarchy_export.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${csvData.length - 1} work items`, { id: 'export-loading' });
      
    } catch (error) {
      console.error('Failed to export project:', error);
      toast.error('Failed to export project data', { id: 'export-loading' });
    }
  };

  // Load files when component mounts or projectId changes
  useEffect(() => {
    if (projectId) {
      loadProjectFiles();
    }
  }, [projectId]);

  // Note: projectEpics is now provided by useProjectWorkItems hook above

  if (projectsLoading && !currentProject) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: '200px' }} />
      </Box>
    );
  }

  if (!currentProject) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Project not found
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
            onClick={handleBackToDashboard}
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
            onClick={handleBackToProjects}
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
          <Chip
            icon={<ProjectIcon sx={{ fontSize: '0.9rem' }} />}
            label={currentProject?.name || 'Project'}
            variant="outlined"
            size="small"
            title={currentProject?.name || 'Project'}
            sx={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'primary.main',
              borderColor: 'primary.main',
              maxWidth: '250px',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '200px'
              },
              verticalAlign: 'top'
            }}
          />
        </Breadcrumbs>

        {/* Compact Project Header */}
        <Paper sx={{ p: 1, mb: 0.5, borderRadius: 1, boxShadow: 1 }}> {/* Further reduced padding */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}> {/* Further reduced margin */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {/* Further reduced gap */}
              <Avatar
                sx={{
                  width: 32, // Further reduced size
                  height: 32, // Further reduced size
                  bgcolor: getPriorityColor(currentProject.priority),
                  fontSize: '0.9rem', // Further reduced font size
                  fontWeight: 600,
                }}
              >
                {currentProject.key}
              </Avatar>
              <InlineEditableText
                value={currentProject.name}
                onSave={handleProjectNameUpdate}
                variant="h6" // Further reduced from h5
                color="text.primary"
                placeholder="Click to edit project name"
                maxLength={100}
                loading={updating.name}
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  fontSize: '1.1rem', // Further reduced font size
                  '&:hover': { 
                    bgcolor: 'action.hover',
                  },
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={handleExportProject}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Export
              </Button>
              <ActiveStatusToggle
                itemType="project"
                itemId={currentProject.id}
                itemTitle={currentProject.name || 'Project'}
                currentStatus={currentProject.active}
                onStatusChange={async (itemId, newStatus) => {
                  try {
                    // Call the toggle API
                    const updatedProject = await projectsAPI.toggleProjectActiveStatus(itemId, newStatus);
                    
                    // Update the Redux state with the updated project data to prevent any stale state issues
                    dispatch(updateCurrentProject(updatedProject));
                    
                    // If project was deactivated, navigate to projects page
                    if (newStatus === false) {
                      // Add a small delay to ensure the success message is shown
                      setTimeout(() => {
                        navigate('/projects');
                      }, 1500);
                    }
                    
                    // Return the updated project to satisfy the ActiveStatusToggle component
                    return updatedProject;
                  } catch (error) {
                    console.error('Failed to toggle project status:', error);
                    throw error; // Re-throw to let ActiveStatusToggle handle the error
                  }
                }}
              />
            </Box>
          </Box>

          {/* Expandable Inline Description Section */}
          <ExpandableInlineDescription
            title="Description"
            value={currentProject.description || ''}
            onSave={handleProjectDescriptionUpdate}
            placeholder="Click to add project description"
            loading={updating.description}
            maxLength={500}
            containerSx={{ mt: 0.5 }}
          />
        </Paper>

  {/* Ultra-Compact Project Stats (now in same sticky section) */}
  <Grid container spacing={1} sx={{ mb: 0, mt: 2 }}> {/* No margin below stats cards */}
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: 'rgba(139, 69, 255, 0.1)', border: '1px solid rgba(139, 69, 255, 0.2)', boxShadow: 'none' }}>
              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                  <EpicIcon sx={{ color: 'primary.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {projectEpics.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>Total Epics</span>
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', boxShadow: 'none' }}>
              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                  <StoryIcon sx={{ color: 'success.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {allStories?.length || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>Work Items</span>
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
                      {allTasks?.length || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>Tasks</span>
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
            <Card sx={{ bgcolor: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.2)', boxShadow: 'none' }}>
              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                  <FilesIcon sx={{ color: 'warning.main', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {projectFiles.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}> {/* Ultra-small caption */}
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>Files</span>
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
                cursor: inactiveItemsCount > 0 ? 'pointer' : 'default',
                '&:hover': inactiveItemsCount > 0 ? {
                  bgcolor: 'rgba(158, 158, 158, 0.15)',
                  transform: 'translateY(-1px)',
                  transition: 'all 0.2s ease-in-out'
                } : {}
              }}
              onClick={inactiveItemsCount > 0 ? handleViewInactiveWorkItems : undefined}
            >
              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 } }}> {/* Ultra-reduced padding */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> {/* Ultra-reduced gap */}
                  <InactiveIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} /> {/* Smaller icon */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}> {/* Smaller font and tighter line height */}
                      {inactiveItemsCount}
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

        {/* Epics Section */}
        <Paper sx={{ borderRadius: 1, overflow: 'hidden', mt: 0 }}>
          <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Epics ({totalEpics}{totalInactiveEpics > 0 ? ` Active, ${totalInactiveEpics} Inactive` : ''})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, py: 0.3 }}>
                <ViewToggle
                  currentView={viewPreferences.epics}
                  onViewChange={handleViewChange}
                  disabled={workItemsLoading || (totalEpics === 0 && totalInactiveEpics === 0)}
                />
                <Button
                  variant="outlined"
                  startIcon={<FilesIcon />}
                  onClick={handleViewFiles}
                  size="small"
                  sx={{ 
                    textTransform: 'none', 
                    minWidth: 'auto',
                    fontWeight: 500, 
                    fontSize: '0.75rem',
                    px: 1,
                    py: 0.4,
                    borderColor: 'primary.main', 
                    color: 'primary.main', 
                    boxShadow: 0,
                    height: 28,
                    '&:hover': { borderColor: 'primary.dark', bgcolor: 'action.hover' }
                  }}
                >
                  Files ({projectFiles.length})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleCreateEpic}
                  size="small"
                  sx={{ 
                    textTransform: 'none', 
                    minWidth: 85,
                    fontWeight: 500, 
                    fontSize: '0.75rem',
                    px: 1,
                    py: 0.4,
                    borderColor: 'primary.main', 
                    color: 'primary.main', 
                    boxShadow: 0,
                    height: 28,
                    '&:hover': { borderColor: 'primary.dark', bgcolor: 'action.hover' }
                  }}
                >
                  Add Epic
                </Button>
                <Box sx={{ '& .MuiButton-root': { height: 28, fontSize: '0.75rem' } }}>
                  <FileUploadComponent 
                    projectId={projectId}
                    onUploadComplete={handleFileUploadComplete}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Active Epics Section */}
          <Box>
            {totalEpics > 0 && (
              <Box sx={{ borderBottom: totalInactiveEpics > 0 ? '1px solid' : 'none', borderColor: 'divider' }}>
                {totalInactiveEpics > 0 && (
                  <Box sx={{ p: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'success.main' }}>
                      Active Epics ({totalEpics})
                    </Typography>
                  </Box>
                )}
                <WorkItemDisplay
                  items={paginatedEpics}
                  itemType="epic"
                  viewType={viewPreferences.epics}
                  loading={workItemsLoading}
                  onItemClick={handleEpicClick}
                  onStatusChange={handleEpicStatusChange}
                  onPriorityChange={handleEpicPriorityChange}
                  showDescription={false}
                  compact={true}
                  columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
                  emptyStateProps={{
                    show: totalEpics === 0 && totalInactiveEpics === 0,
                    icon: <EpicIcon />,
                    title: "Ready to organize your work?",
                    description: "Upload a document to automatically generate epics and work items, or create your first epic manually.",
                    actions: [
                      <Button
                        key="create"
                        variant="outlined"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={handleCreateEpic}
                        sx={{ 
                          textTransform: 'none',
                          minWidth: 140,
                          fontWeight: 600,
                          fontSize: '1rem',
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          boxShadow: 0,
                          px: 4,
                          py: 1.5,
                          '&:hover': { 
                            borderColor: 'primary.dark', 
                            bgcolor: 'action.hover' 
                          }
                        }}
                      >
                        Create Epic
                      </Button>,
                      <Button
                        key="ai"
                        variant="outlined"
                        size="large"
                        startIcon={<ChatBotIcon />}
                        onClick={handleOpenChatBot}
                        sx={{ 
                          textTransform: 'none',
                          px: 4,
                          py: 1.5,
                          color: 'secondary.main',
                          borderColor: 'secondary.main',
                          '&:hover': {
                            borderColor: 'secondary.dark',
                            bgcolor: 'secondary.50',
                          }
                        }}
                      >
                        AI Assistant
                      </Button>,
                      <Box key="upload" sx={{ '& .MuiButton-root': { 
                        textTransform: 'none',
                        px: 4,
                        py: 1.5,
                        color: 'success.main',
                        borderColor: 'success.main',
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.50',
                        }
                      }}}>
                        <FileUploadComponent 
                          projectId={projectId}
                          onUploadComplete={handleFileUploadComplete}
                        />
                      </Box>
                    ]
                  }}
                />
                
                {/* Pagination for Active Epics */}
                {totalEpics > 0 && (
                  <LazyPaginationComponent
                    currentPage={epicsCurrentPage}
                    totalPages={epicsTotalPages}
                    hasNext={epicsHasNext}
                    hasPrev={epicsHasPrev}
                    startIndex={epicsStartIndex}
                    endIndex={epicsEndIndex}
                    totalItems={totalEpics}
                    onNext={goToNextEpicsPage}
                    onPrev={goToPrevEpicsPage}
                    itemType="active epics"
                    showPageInfo={true}
                    showFirstLast={false}
                    size="small"
                  />
                )}
              </Box>
            )}

            {/* Inactive Epics Section */}
            {totalInactiveEpics > 0 && (
              <Box>
                <Box sx={{ p: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}>
                    Inactive Epics ({totalInactiveEpics})
                  </Typography>
                </Box>
                <WorkItemDisplay
                  items={paginatedInactiveEpics}
                  itemType="epic"
                  viewType={viewPreferences.epics}
                  loading={workItemsLoading}
                  onItemClick={(epic, event) => {
                    // For inactive epics, show reactivation option
                    event.stopPropagation();
                    toast.info(`Epic "${epic.title || epic.name}" is inactive. Click the reactivate button to enable it.`);
                  }}
                  showDescription={false}
                  compact={true}
                  columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
                  customActions={[
                    {
                      label: 'Reactivate',
                      icon: <PlayIcon />,
                      color: 'success',
                      onClick: handleReactivateEpic
                    }
                  ]}
                />
                
                {/* Pagination for Inactive Epics */}
                {totalInactiveEpics > 0 && (
                  <LazyPaginationComponent
                    currentPage={inactiveEpicsCurrentPage}
                    totalPages={inactiveEpicsTotalPages}
                    hasNext={inactiveEpicsHasNext}
                    hasPrev={inactiveEpicsHasPrev}
                    startIndex={inactiveEpicsStartIndex}
                    endIndex={inactiveEpicsEndIndex}
                    totalItems={totalInactiveEpics}
                    onNext={goToNextInactiveEpicsPage}
                    onPrev={goToPrevInactiveEpicsPage}
                    itemType="inactive epics"
                    showPageInfo={true}
                    showFirstLast={false}
                    size="small"
                  />
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Project ChatBot Dialog */}
      <ProjectChatBot
        open={chatBotOpen}
        onClose={handleCloseChatBot}
        projectId={projectId}
      />

      {/* Add Epic Dialog */}
      <Dialog 
        open={addEpicDialogOpen} 
        onClose={handleCloseAddEpicDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EpicIcon color="primary" />
            Add New Epic
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Epic Title"
              value={newEpicData.title}
              onChange={(e) => handleEpicDataChange('title', e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Description"
              value={newEpicData.description}
              onChange={(e) => handleEpicDataChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newEpicData.priority}
                label="Priority"
                onChange={(e) => handleEpicDataChange('priority', e.target.value)}
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
            onClick={handleCloseAddEpicDialog}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddEpic}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={addingEpic || !newEpicData.title.trim()}
          >
            {addingEpic ? 'Adding...' : 'Add Epic'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Files Dialog */}
      <Dialog 
        open={filesDialogOpen} 
        onClose={handleCloseFilesDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilesIcon color="primary" />
              Project Files ({projectFiles.length})
            </Box>
            <Box sx={{ '& .MuiButton-root': { height: 32, fontSize: '0.75rem' } }}>
              <FileUploadComponent 
                projectId={projectId}
                onUploadComplete={handleFileUploadComplete}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {filesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          ) : projectFiles.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FilesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No files uploaded
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload documents to automatically generate epics and work items
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Files uploaded to this project:
              </Typography>
              {projectFiles.map((file, index) => (
                <Box
                  key={file.id || index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <FilesIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {file.file_name || file.filename || file.original_filename || file.name || 'Unknown file'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Date unknown'}
                      {file.file_size && ` • ${Math.round(parseInt(file.file_size) / 1024)} KB`}
                    </Typography>
                  </Box>
                  {file.status && (
                    <Chip 
                      label={file.status} 
                      size="small" 
                      color={file.status === 'processed' ? 'success' : 'default'}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseFilesDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Chat Button */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 120,
          right: 24,
          zIndex: 1000,
        }}
      >
        <Button
          variant="contained"
          onClick={handleOpenChatBot}
          sx={{
            minWidth: 56,
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'secondary.main',
            color: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            '&:hover': {
              bgcolor: 'secondary.dark',
              boxShadow: '0 6px 25px rgba(0,0,0,0.2)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <ChatIcon fontSize="medium" />
        </Button>
      </Box>

      {/* Inactive Work Items Modal */}
      <InactiveWorkItemsModal
        open={inactiveWorkItemsModalOpen}
        onClose={handleCloseInactiveWorkItemsModal}
        projectId={projectId}
        onWorkItemActivated={handleWorkItemActivated}
      />
    </Box>
  );
};

export default ProjectDetailPage;