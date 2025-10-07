import React, { useState } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';

// Status configuration with colors and labels
const STATUS_CONFIG = {
  AI_GENERATED: {
    label: 'AI Generated',
    color: 'info',
    bgColor: '#e3f2fd',
    textColor: '#1976d2'
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'warning',
    bgColor: '#fff3e0',
    textColor: '#f57c00'
  },
  REVIEWED: {
    label: 'Reviewed',
    color: 'secondary',
    bgColor: '#f3e5f5',
    textColor: '#8e24aa'
  },
  APPROVED: {
    label: 'Approved',
    color: 'success',
    bgColor: '#e8f5e8',
    textColor: '#2e7d32'
  }
};

const StatusDropdown = ({ 
  workItemId, 
  currentStatus, 
  onStatusChange, 
  disabled = false,
  size = 'small',
  variant = 'chip' // 'chip' or 'select'
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === status || loading) return;

    setLoading(true);
    try {
      await projectsAPI.updateWorkItemStatus(workItemId, newStatus);
      setStatus(newStatus);
      
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      let errorMessage = 'Failed to update status';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'chip') {
    return (
      <FormControl size={size} disabled={disabled || loading}>
        <Select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          displayEmpty
          renderValue={(value) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {loading && <CircularProgress size={16} />}
              <Chip
                label={STATUS_CONFIG[value]?.label || value}
                size="small"
                sx={{
                  backgroundColor: STATUS_CONFIG[value]?.bgColor,
                  color: STATUS_CONFIG[value]?.textColor,
                  fontWeight: 500,
                  '& .MuiChip-label': {
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Box>
          )}
          sx={{
            minWidth: 120,
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            },
            '& .MuiSelect-select': {
              padding: '4px 8px',
            }
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
            <MenuItem key={statusKey} value={statusKey}>
              <Chip
                label={config.label}
                size="small"
                sx={{
                  backgroundColor: config.bgColor,
                  color: config.textColor,
                  fontWeight: 500
                }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Regular select variant
  return (
    <FormControl size={size} disabled={disabled || loading} sx={{ minWidth: 120 }}>
      <Select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        displayEmpty
        startAdornment={loading && (
          <Box sx={{ mr: 1 }}>
            <CircularProgress size={16} />
          </Box>
        )}
      >
        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
          <MenuItem key={statusKey} value={statusKey}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: config.textColor
                }}
              />
              <Typography variant="body2">{config.label}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default StatusDropdown;