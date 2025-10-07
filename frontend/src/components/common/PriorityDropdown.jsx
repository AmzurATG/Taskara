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
import { Flag as FlagIcon } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';

// Priority configuration with colors and labels
const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'success',
    bgColor: '#e8f5e8',
    textColor: '#2e7d32'
  },
  medium: {
    label: 'Medium',
    color: 'info',
    bgColor: '#e3f2fd',
    textColor: '#1976d2'
  },
  high: {
    label: 'High',
    color: 'warning',
    bgColor: '#fff3e0',
    textColor: '#f57c00'
  },
  critical: {
    label: 'Critical',
    color: 'error',
    bgColor: '#ffebee',
    textColor: '#d32f2f'
  }
};

const PriorityDropdown = ({ 
  workItemId, 
  currentPriority, 
  onPriorityChange, 
  disabled = false,
  size = 'small',
  variant = 'chip' // 'chip' or 'select'
}) => {
  const [loading, setLoading] = useState(false);

  const handlePriorityChange = async (newPriority) => {
    if (loading || disabled) return;
    
    setLoading(true);
    try {
      await projectsAPI.updateWorkItem(workItemId, { priority: newPriority });
      toast.success(`Priority updated to ${PRIORITY_CONFIG[newPriority]?.label || newPriority}`);
      
      // Call the callback with the new priority
      if (onPriorityChange) {
        await onPriorityChange(newPriority);
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentConfig = () => {
    return PRIORITY_CONFIG[currentPriority] || PRIORITY_CONFIG.medium;
  };

  if (variant === 'chip') {
    return (
      <FormControl size={size} disabled={disabled || loading}>
        <Select
          value={currentPriority || 'medium'}
          onChange={(e) => handlePriorityChange(e.target.value)}
          sx={{
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.5,
              px: 1,
              border: 'none',
              '&:focus': {
                backgroundColor: 'transparent'
              }
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            }
          }}
          renderValue={(value) => {
            const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;
            return (
              <Chip
                icon={loading ? <CircularProgress size={12} /> : <FlagIcon fontSize="small" />}
                label={config.label}
                size={size}
                sx={{
                  bgcolor: config.bgColor,
                  color: config.textColor,
                  border: `1px solid ${config.textColor}40`,
                  '& .MuiChip-icon': {
                    color: config.textColor
                  }
                }}
              />
            );
          }}
        >
          {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
            <MenuItem key={value} value={value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FlagIcon fontSize="small" sx={{ color: config.textColor }} />
                <Typography variant="body2">{config.label}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Default select variant
  return (
    <FormControl size={size} disabled={disabled || loading} sx={{ minWidth: 120 }}>
      <Select
        value={currentPriority || 'medium'}
        onChange={(e) => handlePriorityChange(e.target.value)}
        displayEmpty
        sx={{
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }
        }}
        renderValue={(value) => {
          const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {loading ? (
                <CircularProgress size={16} />
              ) : (
                <FlagIcon fontSize="small" sx={{ color: config.textColor }} />
              )}
              <Typography variant="body2">{config.label}</Typography>
            </Box>
          );
        }}
      >
        {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
          <MenuItem key={value} value={value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlagIcon fontSize="small" sx={{ color: config.textColor }} />
              <Typography variant="body2">{config.label}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default PriorityDropdown;