import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

const ViewToggle = ({ 
  currentView = 'table', 
  onViewChange, 
  disabled = false,
  size = 'medium' 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewSelect = (view) => {
    onViewChange(view);
    handleClose();
  };

  const viewOptions = [
    {
      value: 'table',
      label: 'Table View',
      icon: <ListViewIcon fontSize="small" />,
      description: 'Compact table format'
    },
    {
      value: 'card',
      label: 'Card View',
      icon: <CardViewIcon fontSize="small" />,
      description: 'Visual card layout'
    }
  ];

  const currentViewOption = viewOptions.find(option => option.value === currentView);

  return (
    <Box>
      <Button
        variant="outlined"
        size={size}
        onClick={handleClick}
        disabled={disabled}
        endIcon={<ArrowDownIcon />}
        startIcon={currentViewOption?.icon}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          minWidth: 120,
          borderColor: 'divider',
          color: 'text.primary',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        {currentViewOption?.label}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 200,
            mt: 1,
            boxShadow: 3,
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {viewOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleViewSelect(option.value)}
            selected={currentView === option.value}
            sx={{
              py: 1.5,
              '&.Mui-selected': {
                bgcolor: 'primary.50',
                '&:hover': {
                  bgcolor: 'primary.100',
                },
              },
            }}
          >
            <ListItemIcon>
              {option.icon}
            </ListItemIcon>
            <ListItemText
              primary={option.label}
              secondary={option.description}
              primaryTypographyProps={{
                fontWeight: currentView === option.value ? 600 : 400,
              }}
            />
            {currentView === option.value && (
              <CheckIcon 
                fontSize="small" 
                sx={{ ml: 1, color: 'primary.main' }} 
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default ViewToggle;