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
  Switch,
  Box,
  CircularProgress,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';
import { workItemsAPI } from '../../services/api/workItems';

const InactiveWorkItemsModal = ({ open, onClose, projectId, onWorkItemActivated }) => {
  const [inactiveItems, setInactiveItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState({});
  const [error, setError] = useState(null);

  // Fetch inactive work items when modal opens
  useEffect(() => {
    if (open && projectId) {
      fetchInactiveItems();
    }
  }, [open, projectId]);

  const fetchInactiveItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await workItemsAPI.getInactiveWorkItems(projectId);
      setInactiveItems(response || []);
    } catch (err) {
      console.error('Error fetching inactive work items:', err);
      setError('Failed to load inactive work items');
      toast.error('Failed to load inactive work items');
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
      
      toast.success('Work item activated successfully');
      
      // Notify parent component about the activation
      if (onWorkItemActivated) {
        onWorkItemActivated(workItemId);
      }
    } catch (err) {
      console.error('Error activating work item:', err);
      toast.error('Failed to activate work item');
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
        <Typography variant="h6">Inactive Work Items</Typography>
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
              No Inactive Work Items
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All work items in this project are currently active.
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

export default InactiveWorkItemsModal;