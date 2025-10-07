import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Box,
  Avatar,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  FolderOpen as ProjectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

const ProjectCard = ({ project, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewProject = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleEdit = () => {
    onEdit(project);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(project);
    handleMenuClose();
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'P';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
        },
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
              mr: 2,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {getInitials(project.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '1.1rem',
                lineHeight: 1.3,
                mb: 0.5,
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
              onClick={handleViewProject}
              noWrap
            >
              {project.name}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
            mb: 2,
          }}
        >
          {project.description || 'No description provided'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label="Active"
            color="success"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          {project.created_at && (
            <Chip
              size="small"
              label={`Created ${new Date(project.created_at).toLocaleDateString()}`}
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<ViewIcon />}
          onClick={handleViewProject}
          sx={{ textTransform: 'none' }}
        >
          View Project
        </Button>
      </CardActions>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 120,
            borderRadius: 1,
          },
        }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default ProjectCard;
