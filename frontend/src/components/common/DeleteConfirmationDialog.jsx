import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const DeleteConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = 'item',
  cascadeWarning = null,
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'error.main',
        }}
      >
        <DeleteIcon />
        Delete {itemType}
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText component="div">
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete <strong>"{title || itemName}"</strong>?
          </Typography>
          
          {cascadeWarning && (
            <Alert 
              severity="warning" 
              icon={<WarningIcon />}
              sx={{ mt: 2, mb: 1 }}
            >
              <Typography variant="body2">
                <strong>Warning:</strong> {cascadeWarning}
              </Typography>
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContentText>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={<DeleteIcon />}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;