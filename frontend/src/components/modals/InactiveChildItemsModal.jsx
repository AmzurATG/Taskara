import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  CircularProgress,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { workItemsAPI } from '../../services/api/workItems';

const InactiveChildItemsModal = ({ 
  open, 
  onClose, 
  parentId, 
  parentType, 
  childType, 
  onWorkItemActivated 
}) => {
  const [inactiveItems, setInactiveItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState({});
  const [error, setError] = useState(null);

  // Fetch inactive child work items when modal opens
  useEffect(() => {
    if (open && parentId) {
      fetchInactiveChildItems();
    }
  }, [open, parentId]);

  const fetchInactiveChildItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await workItemsAPI.getInactiveChildWorkItems(parentId, childType);
      setInactiveItems(response || []);
    } catch (err) {
      console.error('Error fetching inactive child work items:', err);
      setError(`Failed to load inactive ${childType}s`);
      toast.error(`Failed to load inactive ${childType}s`);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateItem = async (workItemId) => {
    setActivating(prev => ({ ...prev, [workItemId]: true }));
    try {
      await workItemsAPI.toggleWorkItemActive(workItemId, { active: true });
      
      // Remove the activated item from the list
      setInactiveItems(prev => prev.filter(item => item.id !== workItemId));
      
      toast.success(`${childType.charAt(0).toUpperCase() + childType.slice(1)} activated successfully`);
      
      // Notify parent component about the activation
      if (onWorkItemActivated) {
        onWorkItemActivated(workItemId);
      }
    } catch (err) {
      console.error('Error activating work item:', err);
      toast.error(`Failed to activate ${childType}`);
    } finally {
      setActivating(prev => ({ ...prev, [workItemId]: false }));
    }
  };

  const getItemTypeColor = (itemType) => {
    const colors = {
      epic: 'primary',
      story: 'success',
      task: 'info',
      subtask: 'secondary',
    };
    return colors[itemType?.toLowerCase()] || 'default';
  };

  const formatItemType = (itemType) => {
    return itemType?.charAt(0).toUpperCase() + itemType?.slice(1).toLowerCase();
  };

  const getModalTitle = () => {
    const childTypePlural = childType === 'story' ? 'Stories' : 
                           childType === 'task' ? 'Tasks' : 
                           childType === 'subtask' ? 'Subtasks' : 
                           `${childType}s`;
    return `Inactive ${childTypePlural}`;
  };

  const getEmptyStateMessage = () => {
    const childTypePlural = childType === 'story' ? 'stories' : 
                           childType === 'task' ? 'tasks' : 
                           childType === 'subtask' ? 'subtasks' : 
                           `${childType}s`;
    return `All ${childTypePlural} in this ${parentType} are currently active.`;
  };

  const handleClose = () => {
    setInactiveItems([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{getModalTitle()}</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : inactiveItems.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px">
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Inactive {getModalTitle().split(' ')[1]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getEmptyStateMessage()}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Name
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Type
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Status
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Priority
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Activate
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inactiveItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.title}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {item.description.length > 100 
                            ? `${item.description.substring(0, 100)}...` 
                            : item.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatItemType(item.item_type)}
                        color={getItemTypeColor(item.item_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status?.charAt(0).toUpperCase() + item.status?.slice(1).toLowerCase()}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1).toLowerCase()}
                        size="small"
                        color={
                          item.priority === 'high' ? 'error' :
                          item.priority === 'medium' ? 'warning' : 'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleActivateItem(item.id)}
                        disabled={activating[item.id]}
                        startIcon={activating[item.id] ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                        sx={{ minWidth: '100px' }}
                      >
                        {activating[item.id] ? 'Activating...' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InactiveChildItemsModal;