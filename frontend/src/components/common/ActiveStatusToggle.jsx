import React, { useState } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import {
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';

const ActiveStatusToggle = ({
  itemType = 'project', // 'project', 'epic', 'story', 'task', 'subtask'
  itemId,
  itemTitle,
  currentStatus = true,
  onStatusChange,
  disabled = false,
  size = 'small',
}) => {
  const [status, setStatus] = useState(currentStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStatusClick = (newStatus) => {
    if (newStatus === status) return; // No change needed
    
    // If trying to make inactive, show confirmation dialog
    if (!newStatus) {
      setPendingStatus(newStatus);
      setDialogOpen(true);
    } else {
      // Directly activate without confirmation
      handleConfirmStatusChange(newStatus);
    }
  };

  const handleConfirmStatusChange = async (newStatus) => {
    setLoading(true);
    setDialogOpen(false);
    
    try {
      await onStatusChange(itemId, newStatus);
      setStatus(newStatus);
      
      const statusText = newStatus ? 'activated' : 'deactivated';
      toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${statusText} successfully`);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(`Failed to update ${itemType} status`);
    } finally {
      setLoading(false);
      setPendingStatus(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setPendingStatus(null);
  };

  const getItemTypeLabel = () => {
    return itemType.charAt(0).toUpperCase() + itemType.slice(1);
  };

  const getCascadeWarning = () => {
    switch (itemType) {
      case 'project':
        return 'This will also deactivate all epics, stories, tasks, and subtasks in this project.';
      case 'epic':
        return 'This will also deactivate all stories, tasks, and subtasks in this epic.';
      case 'story':
        return 'This will also deactivate all tasks and subtasks in this story.';
      case 'task':
        return 'This will also deactivate all subtasks in this task.';
      default:
        return '';
    }
  };

  return (
    <>
      <FormControl size={size} disabled={disabled || loading} sx={{ minWidth: 100 }}>
        <Select
          value={status ? 'active' : 'inactive'}
          onChange={() => {}} // Handled by onClick of MenuItem
          renderValue={(value) => (
            <Typography>
              {value === 'active' ? 'Active' : 'Inactive'}
            </Typography>
          )}
          sx={{
            '& .MuiSelect-select': {
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
            },
          }}
        >
          <MenuItem 
            value="active" 
            onClick={() => handleStatusClick(true)}
            selected={status === true}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ActiveIcon color="success" fontSize="small" />
              <Typography>Active</Typography>
            </Box>
          </MenuItem>
          <MenuItem 
            value="inactive" 
            onClick={() => handleStatusClick(false)}
            selected={status === false}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InactiveIcon color="disabled" fontSize="small" />
              <Typography>Inactive</Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InactiveIcon color="warning" />
            Deactivate {getItemTypeLabel()}?
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to deactivate "{itemTitle}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={() => handleConfirmStatusChange(pendingStatus)} 
            color="warning"
            variant="contained"
            disabled={loading}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ActiveStatusToggle;