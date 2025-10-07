import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

import { deleteProject } from '../../store/slices/projectsSlice.js';

const DeleteProjectDialog = ({ open, onClose, project }) => {
  const dispatch = useDispatch();
  const { projectsLoading } = useSelector((state) => state.projects);

  const handleDelete = async () => {
    try {
      await dispatch(deleteProject(project.id)).unwrap();
      toast.success('Project deleted successfully!');
      onClose();
    } catch (error) {
      toast.error(error || 'Failed to delete project');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: 'error.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Delete Project
          </Typography>
        </Box>
      </DialogTitle>

      {projectsLoading && <LinearProgress />}

      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            This action cannot be undone. All associated work items, epics, stories, and tasks will also be deleted.
          </Typography>
        </Alert>

        <Typography variant="body1" sx={{ mb: 1 }}>
          Are you sure you want to delete the project:
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            bgcolor: 'action.hover',
            p: 1,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {project?.name}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: 'none',
            borderRadius: 1.5,
            px: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={projectsLoading}
          sx={{
            textTransform: 'none',
            borderRadius: 1.5,
            px: 3,
          }}
        >
          {projectsLoading ? 'Deleting...' : 'Delete Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteProjectDialog;