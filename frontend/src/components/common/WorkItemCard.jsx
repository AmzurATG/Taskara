import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
} from '@mui/material';
import {
  BookmarkBorder as EpicIcon,
  Assignment as StoryIcon,
  Task as TaskIcon,
  CheckBox as SubtaskIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Flag as FlagIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const WorkItemCard = ({
  item,
  itemType,
  onItemClick,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  statusOptions = [
    { value: 'AI_GENERATED', label: 'AI Generated' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'APPROVED', label: 'Approved' }
  ],
  priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ],
  showMenu = true,
  compact = false,
  showDescription = true,
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    onEdit?.(item);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete?.(item);
    handleMenuClose();
  };

  const getItemIcon = () => {
    switch (itemType) {
      case 'epic':
        return <EpicIcon />;
      case 'story':
        return <StoryIcon />;
      case 'task':
        return <TaskIcon />;
      case 'subtask':
        return <SubtaskIcon />;
      default:
        return <TaskIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo':
        return 'default';
      case 'in progress':
        return 'primary';
      case 'in review':
        return 'warning';
      case 'done':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo':
        return <ScheduleIcon fontSize="small" />;
      case 'in progress':
        return <PlayIcon fontSize="small" />;
      case 'done':
        return <CheckCircleIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'highest':
        return '#d32f2f';
      case 'high':
        return '#f57c00';
      case 'medium':
        return '#1976d2';
      case 'low':
        return '#388e3c';
      case 'lowest':
        return '#616161';
      default:
        return '#1976d2';
    }
  };

  const getItemTypeColor = () => {
    switch (itemType) {
      case 'epic':
        return 'rgba(139, 69, 255, 0.1)';
      case 'story':
        return 'rgba(34, 197, 94, 0.1)';
      case 'task':
        return 'rgba(59, 130, 246, 0.1)';
      case 'subtask':
        return 'rgba(156, 39, 176, 0.1)';
      default:
        return 'rgba(128, 128, 128, 0.1)';
    }
  };

  const getItemTypeBorderColor = () => {
    switch (itemType) {
      case 'epic':
        return 'rgba(139, 69, 255, 0.3)';
      case 'story':
        return 'rgba(34, 197, 94, 0.3)';
      case 'task':
        return 'rgba(59, 130, 246, 0.3)';
      case 'subtask':
        return 'rgba(156, 39, 176, 0.3)';
      default:
        return 'rgba(128, 128, 128, 0.3)';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: getItemTypeBorderColor(),
        bgcolor: getItemTypeColor(),
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardActionArea
        onClick={() => onItemClick?.(item)}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          p: 0,
        }}
      >
        <CardContent
          sx={{
            flexGrow: 1,
            p: compact ? 2 : 2.5,
            '&:last-child': { pb: compact ? 2 : 2.5 },
          }}
        >
          {/* Header with icon, title and menu */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              mb: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Typography
                variant={compact ? 'body2' : 'subtitle1'}
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </Typography>
            </Box>
            {showMenu && (
              <IconButton
                size="small"
                onClick={handleMenuClick}
                sx={{ ml: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Description */}
          {item.description && !compact && showDescription && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.4,
              }}
            >
              {item.description}
            </Typography>
          )}

          {/* Tags and Status */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              mt: 'auto',
            }}
          >
            {/* Status Chip/Dropdown */}
            {onStatusChange ? (
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={item.status || 'IN_REVIEW'}
                  onChange={(e) => onStatusChange(item.id, e.target.value)}
                  sx={{ 
                    fontSize: '0.75rem',
                    '& .MuiSelect-select': { py: 0.5 }
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.75rem' }}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Chip
                icon={getStatusIcon(item.status)}
                label={item.status || 'Todo'}
                color={getStatusColor(item.status)}
                size={compact ? 'small' : 'medium'}
                variant="outlined"
              />
            )}

            {/* Priority Chip/Dropdown */}
            {onPriorityChange ? (
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={item.priority || 'medium'}
                  onChange={(e) => onPriorityChange(item.id, e.target.value)}
                  sx={{ 
                    fontSize: '0.75rem',
                    '& .MuiSelect-select': { py: 0.5 }
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {priorityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.75rem' }}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Chip
                icon={<FlagIcon fontSize="small" />}
                label={item.priority || 'Medium'}
                size={compact ? 'small' : 'medium'}
                sx={{
                  bgcolor: `${getPriorityColor(item.priority)}15`,
                  color: getPriorityColor(item.priority),
                  border: `1px solid ${getPriorityColor(item.priority)}30`,
                }}
              />
            )}

            {/* Assignee */}
            {item.assignee && (
              <Chip
                icon={<PersonIcon fontSize="small" />}
                label={item.assignee}
                size={compact ? 'small' : 'medium'}
                variant="outlined"
                color="default"
              />
            )}
          </Box>

          {/* Additional Info */}
          {!compact && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                mt: 2,
                pt: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  {itemType.charAt(0).toUpperCase() + itemType.slice(1)}{item.key ? ` • ${item.key}` : ''}
                </Typography>
                {item.estimated_hours && (
                  <Typography variant="caption" color="text.secondary">
                    {item.estimated_hours}h estimated
                  </Typography>
                )}
              </Box>
              {/* Source File information - same logic as table view */}
              {item.source_file_name || item.sourceFileName || item.source_file || item.file_name || item.fileName ? (
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                  � {item.source_file_name || item.sourceFileName || item.source_file || item.file_name || item.fileName}
                </Typography>
              ) : item.status === 'AI_GENERATED' ? (
                <Typography variant="caption" color="info.main" sx={{ fontWeight: 500 }}>
                  🤖 AI Generated
                </Typography>
              ) : (
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                  ✏️ Manual Entry
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </CardActionArea>

      {/* Context Menu */}
      {showMenu && (
        <Menu
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <MenuItem onClick={handleEdit}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
          )}
          {onDelete && (
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          )}
        </Menu>
      )}
    </Card>
  );
};

export default WorkItemCard;