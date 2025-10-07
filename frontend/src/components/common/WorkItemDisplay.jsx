import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import WorkItemGrid from './WorkItemGrid.jsx';

const WorkItemDisplay = ({
  items = [],
  itemType,
  viewType = 'table', // 'card' or 'table'
  onItemClick,
  loading = false,
  compact = false,
  showDescription = true,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
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
  emptyStateProps = {
    show: true,
    icon: null,
    title: 'No items found',
    subtitle: 'Add some items to get started',
    actions: null
  }
}) => {
  const getStatusColor = (status) => {
    const colors = {
      AI_GENERATED: 'info',
      IN_REVIEW: 'warning',
      REVIEWED: 'primary',
      APPROVED: 'success'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    };
    return colors[priority?.toLowerCase()] || 'default';
  };

  const getItemIcon = (type) => {
    const icons = {
      epic: '📋',
      story: '📖',
      task: '✓',
      subtask: '◦'
    };
    return icons[type] || '•';
  };

  // Card view
  if (viewType === 'card') {
    return (
      <WorkItemGrid
        items={items}
        itemType={itemType}
        viewType="card"
        onItemClick={onItemClick}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        emptyStateProps={emptyStateProps}
        compact={compact}
        showDescription={showDescription}
        columns={columns}
      />
    );
  }

  // Table view (default)
  if (viewType === 'table') {
    // Empty state
    if (items.length === 0 && emptyStateProps.show) {
      return (
        <Box sx={{ textAlign: 'center', py: 8, px: 4 }}>
          {emptyStateProps.icon && (
            <Box sx={{ 
              fontSize: 64, 
              mb: 2, 
              opacity: 0.5,
              display: 'flex',
              justifyContent: 'center'
            }}>
              {emptyStateProps.icon}
            </Box>
          )}
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {emptyStateProps.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {emptyStateProps.subtitle}
          </Typography>
          {emptyStateProps.actions && (
            <Box sx={{ mt: 2 }}>
              {emptyStateProps.actions}
            </Box>
          )}
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.paper' }}>
              <TableCell width="40%"><strong>Name</strong></TableCell>
              <TableCell width="120"><strong>Status</strong></TableCell>
              <TableCell width="120"><strong>Priority</strong></TableCell>
              <TableCell width="200"><strong>Source File</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow 
                key={item.id} 
                hover 
                onClick={() => onItemClick?.(item)}
                sx={{ cursor: onItemClick ? 'pointer' : 'default' }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  {onStatusChange ? (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
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
                      label={item.status?.replace('_', ' ') || 'Unknown'} 
                      size="small" 
                      color={getStatusColor(item.status)}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {onPriorityChange ? (
                    <FormControl size="small" sx={{ minWidth: 100 }}>
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
                      label={item.priority?.toUpperCase() || 'MEDIUM'} 
                      size="small" 
                      color={getPriorityColor(item.priority)}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {/* Show source file name if available, otherwise check status for Manual Entry vs AI Generated */}
                  {item.source_file_name || item.sourceFileName || item.source_file || item.file_name || item.fileName ? (
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                      📄 {item.source_file_name || item.sourceFileName || item.source_file || item.file_name || item.fileName}
                    </Typography>
                  ) : item.status === 'AI_GENERATED' ? (
                    <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                      🤖 AI Generated
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                      ✏️ Manual Entry
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

};

export default WorkItemDisplay;