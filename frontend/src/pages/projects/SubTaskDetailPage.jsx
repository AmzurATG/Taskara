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
  CheckBox as SubtaskIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Home as HomeIcon,
  FolderOpen as ProjectIcon,
  ViewStream as EpicIcon,
  BookmarkBorder as StoryIcon,
  Task as TaskIcon,
} from '@mui/icons-material';

import { useWorkItem, useProjectWorkItems, useProjectHierarchy } from '../../contexts/ProjectHierarchyContext';
import InlineEditableText from '../../components/common/InlineEditableText';
import ExpandableInlineDescription from '../../components/common/ExpandableInlineDescription';
import DeleteConfirmationDialog from '../../components/common/DeleteConfirmationDialog.jsx';
import StatusDropdown from '../../components/common/StatusDropdown.jsx';
import PriorityDropdown from '../../components/common/PriorityDropdown.jsx';
import ActiveStatusToggle from '../../components/common/ActiveStatusToggle.jsx';
import { projectsAPI } from '../../services/api/projects';

// Helper functions for status and priority styling
const getStatusIcon = (status) => {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return <CheckCircleIcon sx={{ fontSize: 16 }} />;
    case 'REVIEWED':
      return <CheckCircleIcon sx={{ fontSize: 16 }} />;
    case 'IN_REVIEW':
      return <PlayIcon sx={{ fontSize: 16 }} />;
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
      return 'info';
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
      return '#f44336';
    case 'high':
      return '#ff9800';
    case 'medium':
      return '#2196f3';
    case 'low':
      return '#4caf50';
    default:
      return '#9e9e9e';
  }
};

const SubTaskDetailPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectId, epicId, storyId, taskId, subtaskId } = useParams();
  
  // State management
  const [projectDetails, setProjectDetails] = useState(null);
  const [epicDetails, setEpicDetails] = useState(null);
  const [storyDetails, setStoryDetails] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updating, setUpdating] = useState({
    title: false,
    description: false,
    priority: false,
    estimatedHours: false,
    acceptanceCriteria: false
  });

  // Get subtask data using context
  const { workItem: currentSubtask, loading: subtaskLoading, refetch: refetchSubtask } = useWorkItem(projectId, subtaskId);
  const { refetch: refetchProjectHierarchy } = useProjectWorkItems(projectId, 'task', taskId);
  const { fetchHierarchy } = useProjectHierarchy();

  // Fetch all parent details for breadcrumbs
  useEffect(() => {
    const fetchAllDetails = async () => {
      try {
        if (projectId) {
          const project = await projectsAPI.getProject(projectId);
          setProjectDetails(project);
        }
        if (epicId) {
          const epic = await projectsAPI.getWorkItem(epicId);
          setEpicDetails(epic);
        }
        if (storyId) {
          const story = await projectsAPI.getWorkItem(storyId);
          setStoryDetails(story);
        }
        if (taskId) {
          const task = await projectsAPI.getWorkItem(taskId);
          setTaskDetails(task);
        }
      } catch (error) {
        console.error('Failed to fetch details:', error);
      }
    };
    fetchAllDetails();
  }, [projectId, epicId, storyId, taskId]);

  // Loading state
  if (subtaskLoading || !currentSubtask) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      </Container>
    );
  }

  // Error state
  if (!currentSubtask.id) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="error" gutterBottom>
            SubTask not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The requested subtask could not be loaded.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${taskId}`)}
          >
            Back to Task
          </Button>
        </Box>
      </Container>
    );
  }

  // Update handlers
  const handleSubtaskTitleUpdate = async (newTitle) => {
    if (!newTitle.trim() || newTitle === currentSubtask.title) {
      return;
    }

    setUpdating(prev => ({ ...prev, title: true }));
    try {
      const updateData = { title: newTitle.trim() };
      
      await projectsAPI.updateWorkItem(currentSubtask.id, updateData);
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentSubtask.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentSubtask.id, 'IN_REVIEW');
        console.log('Subtask status updated from AI_GENERATED to IN_REVIEW');
      }
      
      await refetchSubtask(); // Refresh data
      toast.success('Subtask title updated successfully');
    } catch (error) {
      console.error('Failed to update subtask title:', error);
      toast.error('Failed to update subtask title');
    } finally {
      setUpdating(prev => ({ ...prev, title: false }));
    }
  };

  const handleSubtaskDescriptionUpdate = async (newDescription) => {
    setUpdating(prev => ({ ...prev, description: true }));
    try {
      const updateData = { description: newDescription };
      
      await projectsAPI.updateWorkItem(currentSubtask.id, updateData);
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentSubtask.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentSubtask.id, 'IN_REVIEW');
        console.log('Subtask status updated from AI_GENERATED to IN_REVIEW');
      }
      
      await refetchSubtask(); // Refresh data
      toast.success('Subtask description updated successfully');
    } catch (error) {
      console.error('Failed to update subtask description:', error);
      toast.error('Failed to update subtask description');
    } finally {
      setUpdating(prev => ({ ...prev, description: false }));
    }
  };

  const handleSubtaskPriorityUpdate = async (newPriority) => {
    setUpdating(prev => ({ ...prev, priority: true }));
    try {
      const updateData = { priority: newPriority };
      
      await projectsAPI.updateWorkItem(currentSubtask.id, updateData);
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentSubtask.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentSubtask.id, 'IN_REVIEW');
        console.log('Subtask status updated from AI_GENERATED to IN_REVIEW');
      }
      
      await refetchSubtask(); // Refresh data
      toast.success('Subtask priority updated successfully');
    } catch (error) {
      console.error('Failed to update subtask priority:', error);
      toast.error('Failed to update subtask priority');
    } finally {
      setUpdating(prev => ({ ...prev, priority: false }));
    }
  };

  const handleSubtaskEstimatedHoursUpdate = async (newHours) => {
    const hours = parseInt(newHours);
    if (isNaN(hours) || hours < 0) {
      toast.error('Please enter a valid number of hours');
      return;
    }

    setUpdating(prev => ({ ...prev, estimatedHours: true }));
    try {
      const updateData = { estimated_hours: hours };
      
      await projectsAPI.updateWorkItem(currentSubtask.id, updateData);
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentSubtask.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentSubtask.id, 'IN_REVIEW');
        console.log('Subtask status updated from AI_GENERATED to IN_REVIEW');
      }
      
      await refetchSubtask(); // Refresh data
      toast.success('Estimated hours updated successfully');
    } catch (error) {
      console.error('Failed to update estimated hours:', error);
      toast.error('Failed to update estimated hours');
    } finally {
      setUpdating(prev => ({ ...prev, estimatedHours: false }));
    }
  };

  const handleAcceptanceCriteriaUpdate = async (newCriteria) => {
    setUpdating(prev => ({ ...prev, acceptanceCriteria: true }));
    try {
      let criteriaArray;
      if (typeof newCriteria === 'string') {
        // Try to parse as JSON array, or split by newlines
        try {
          criteriaArray = JSON.parse(newCriteria);
          if (!Array.isArray(criteriaArray)) {
            criteriaArray = [newCriteria];
          }
        } catch {
          // If not valid JSON, split by lines and filter empty ones
          criteriaArray = newCriteria.split('\n').filter(line => line.trim());
        }
      } else {
        criteriaArray = newCriteria;
      }

      const updateData = { acceptance_criteria: criteriaArray };

      await projectsAPI.updateWorkItem(currentSubtask.id, updateData);
      
      // If current status is AI Generated, change to In Review using separate status update
      if (currentSubtask.status === 'AI_GENERATED') {
        await projectsAPI.updateWorkItemStatus(currentSubtask.id, 'IN_REVIEW');
        console.log('Subtask status updated from AI_GENERATED to IN_REVIEW');
      }
      
      await refetchSubtask(); // Refresh data
      toast.success('Acceptance criteria updated successfully');
    } catch (error) {
      console.error('Failed to update acceptance criteria:', error);
      toast.error('Failed to update acceptance criteria');
    } finally {
      setUpdating(prev => ({ ...prev, acceptanceCriteria: false }));
    }
  };

  const handleDeleteSubtask = async () => {
    try {
      await projectsAPI.deleteWorkItem(currentSubtask.id);
      toast.success('Subtask deleted successfully');
      
      // Refetch the project hierarchy to ensure the parent task shows updated subtasks
      await refetchProjectHierarchy();
      
      // Small delay to ensure the refetch is complete
      setTimeout(() => {
        navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${taskId}`);
      }, 100);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      toast.error('Failed to delete subtask');
    }
  };

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
            pt: 0.8, // Further reduced padding
            pb: 1, // Further reduced padding
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
              title={projectDetails?.name || projectDetails?.title || 'Project'}
              sx={{ 
                cursor: 'pointer',
                textDecoration: 'none', 
                color: 'primary.main',
                fontSize: '0.9rem',
                maxWidth: '100px',
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
              {projectDetails?.name || projectDetails?.title || 'Project'}
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}/epics/${epicId}`)}
              title={`Epic: ${epicDetails?.title || epicDetails?.name || 'Epic'}`}
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
              <EpicIcon sx={{ fontSize: '0.9rem' }} />
              {epicDetails?.title || epicDetails?.name || 'Epic'}
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}`)}
              title={`Story: ${storyDetails?.title || storyDetails?.name || 'Story'}`}
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
              <StoryIcon sx={{ fontSize: '0.9rem' }} />
              {storyDetails?.title || storyDetails?.name || 'Story'}
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${taskId}`)}
              title={`Task: ${taskDetails?.title || taskDetails?.name || 'Task'}`}
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
              <TaskIcon sx={{ fontSize: '0.9rem' }} />
              {taskDetails?.title || taskDetails?.name || 'Task'}
            </Link>
            <Chip
              icon={<SubtaskIcon sx={{ fontSize: '0.9rem' }} />}
              label={currentSubtask.title || currentSubtask.name || 'Subtask'}
              variant="outlined"
              size="small"
              title={`SubTask: ${currentSubtask.title || currentSubtask.name || 'Subtask'}`}
              sx={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'warning.main',
                borderColor: 'warning.main',
                maxWidth: '140px',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100px'
                },
                verticalAlign: 'top'
              }}
            />
          </Breadcrumbs>

          {/* Compact Subtask Header */}
          <Box sx={{ p: 1, mb: 0.5, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 28, height: 28, fontSize: '0.8rem' }}>
                  {currentSubtask.key || 'ST'}
                </Avatar>
                <InlineEditableText
                  value={currentSubtask.title || currentSubtask.name || ''}
                  onSave={handleSubtaskTitleUpdate}
                  variant="h6"
                  sx={{ fontWeight: 600, fontSize: '1.1rem' }}
                  disabled={updating.title}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatusDropdown
                  workItemId={currentSubtask.id}
                  currentStatus={currentSubtask.status || 'AI_GENERATED'}
                  onStatusChange={(newStatus) => {
                    console.log('Subtask status updated to:', newStatus);
                    // Refresh subtask data when status is changed via dropdown
                    if (refetchSubtask) refetchSubtask();
                  }}
                  size="medium"
                  variant="chip"
                  label={currentSubtask.status === 'AI_GENERATED' ? 'AI Generated' : currentSubtask.status}
                />
                <PriorityDropdown
                  workItemId={currentSubtask.id}
                  currentPriority={currentSubtask.priority}
                  onPriorityChange={async (newPriority) => {
                    console.log('Subtask priority updated to:', newPriority);
                    // Refresh subtask data when priority is changed
                    if (refetchSubtask) await refetchSubtask();
                    await fetchHierarchy(projectId, true);
                  }}
                  size="small"
                  variant="chip"
                />
                <ActiveStatusToggle
                  itemType="subtask"
                  itemId={currentSubtask.id}
                  itemTitle={currentSubtask.title || currentSubtask.name || 'Subtask'}
                  currentStatus={currentSubtask.active}
                  onStatusChange={(itemId, newStatus) => {
                    // Update the current subtask via API call
                    return projectsAPI.toggleWorkItemActiveStatus(itemId, { active: newStatus })
                      .then(() => {
                        // Refresh the project hierarchy to update parent pages
                        fetchHierarchy(projectId, true);
                        
                        // If deactivating, redirect to parent task page
                        if (!newStatus) {
                          const navigationUrl = `/projects/${projectId}/epics/${epicId}/stories/${storyId}/tasks/${taskId}`;
                          console.log('SubTask deactivation - navigating to:', navigationUrl);
                          console.log('Route params:', { projectId, epicId, storyId, taskId, subtaskId });
                          navigate(navigationUrl);
                          return;
                        }
                        // Refetch subtask data to get updated state
                        if (refetchSubtask) refetchSubtask();
                      });
                  }}
                />
              </Box>
            </Box>

            {/* Expandable Description Section */}
            <Box sx={{ mt: 0.5 }}>
              <ExpandableInlineDescription
                value={currentSubtask.description || ""}
                onSave={handleSubtaskDescriptionUpdate}
                field="description"
                placeholder="Click to add a description for this subtask"
                maxLength={2000}
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
        </Box>

        {/* Subtask Details */}
        <Grid container spacing={2}>
          {/* Main Content - Acceptance Criteria */}
          <Grid item xs={12} md={8}>
            {/* Acceptance Criteria */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Acceptance Criteria
                </Typography>
                <Box>
                  {(() => {
                    try {
                      const criteria = JSON.parse(currentSubtask.acceptance_criteria || '[]');
                      if (Array.isArray(criteria) && criteria.length > 0) {
                        return (
                          <Box>
                            {criteria.map((criteriaItem, index) => (
                              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, minWidth: 20 }}>
                                  {index + 1}.
                                </Typography>
                                <InlineEditableText
                                  value={criteriaItem}
                                  onSave={(newValue) => {
                                    const updatedCriteria = [...criteria];
                                    updatedCriteria[index] = newValue;
                                    handleAcceptanceCriteriaUpdate(updatedCriteria);
                                  }}
                                  placeholder="Click to edit criteria..."
                                  variant="body2"
                                  color="text.secondary"
                                  loading={updating.acceptanceCriteria}
                                />
                              </Box>
                            ))}
                            <InlineEditableText
                              value=""
                              onSave={(newValue) => {
                                if (newValue.trim()) {
                                  handleAcceptanceCriteriaUpdate([...criteria, newValue.trim()]);
                                }
                              }}
                              placeholder="+ Add new acceptance criteria..."
                              variant="body2"
                              color="primary.main"
                              sx={{ fontStyle: 'italic', mt: 1 }}
                              loading={updating.acceptanceCriteria}
                            />
                          </Box>
                        );
                      } else {
                        return (
                          <InlineEditableText
                            value=""
                            onSave={(newValue) => {
                              if (newValue.trim()) {
                                const criteriaLines = newValue.split('\n').filter(line => line.trim());
                                handleAcceptanceCriteriaUpdate(criteriaLines);
                              }
                            }}
                            placeholder="Click to add acceptance criteria..."
                            multiline
                            minRows={2}
                            variant="body2"
                            color="text.secondary"
                            loading={updating.acceptanceCriteria}
                          />
                        );
                      }
                    } catch (error) {
                      return (
                        <InlineEditableText
                          value={currentSubtask.acceptance_criteria || ''}
                          onSave={handleAcceptanceCriteriaUpdate}
                          placeholder="Click to add acceptance criteria..."
                          multiline
                          minRows={2}
                          variant="body2"
                          color="text.secondary"
                          loading={updating.acceptanceCriteria}
                        />
                      );
                    }
                  })()}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Details Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Details
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Priority
                    </Typography>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={currentSubtask.priority || 'medium'}
                        onChange={(e) => handleSubtaskPriorityUpdate(e.target.value)}
                        disabled={updating.priority}
                      >
                        <MenuItem value="critical">Critical</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Estimated Hours
                    </Typography>
                    <InlineEditableText
                      value={currentSubtask.estimated_hours?.toString() || '0'}
                      onSave={handleSubtaskEstimatedHoursUpdate}
                      variant="body1"
                      placeholder="Click to edit estimated hours"
                      loading={updating.estimatedHours}
                      type="number"
                      sx={{
                        fontWeight: 500,
                        p: 1,
                        borderRadius: 1,
                        '&:hover': { 
                          bgcolor: 'action.hover',
                        },
                      }}
                    />
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Created
                    </Typography>
                    <Typography variant="body2">
                      {currentSubtask.created_at ? new Date(currentSubtask.created_at).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Updated
                    </Typography>
                    <Typography variant="body2">
                      {currentSubtask.updated_at ? new Date(currentSubtask.updated_at).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteSubtask}
          title={currentSubtask?.title || currentSubtask?.name}
          type="subtask"
        />
      </Container>
    </Box>
  );
};

export default SubTaskDetailPage;