import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Avatar,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  InsertDriveFile as FileIcon,
  Task as EpicIcon,
  Assignment as StoryIcon,
  CheckBox as TaskIcon,
  SubdirectoryArrowRight as SubtaskIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';

const WorkItemsByFileComponent = ({ projectId, files, onFilesChange }) => {
  const [expandedFiles, setExpandedFiles] = useState({});
  const [fileWorkItems, setFileWorkItems] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkItemsForFiles();
  }, [files]);

  const loadWorkItemsForFiles = async () => {
    if (!files || files.length === 0) return;
    
    setLoading(true);
    const workItemsByFile = {};
    
    for (const file of files) {
      try {
        const workItems = await projectsAPI.getFileWorkItems(file.id);
        workItemsByFile[file.id] = workItems || [];
      } catch (error) {
        console.error(`Failed to load work items for file ${file.id}:`, error);
        workItemsByFile[file.id] = [];
      }
    }
    
    setFileWorkItems(workItemsByFile);
    setLoading(false);
  };

  const toggleFileExpansion = (fileId) => {
    setExpandedFiles(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.file_name}"? This will also delete all work items generated from this file.`)) {
      return;
    }

    try {
      await projectsAPI.deleteFile(file.id);
      toast.success(`File "${file.file_name}" deleted successfully`);
      onFilesChange();
    } catch (error) {
      toast.error(`Failed to delete file: ${error.message}`);
    }
  };

  const getItemTypeIcon = (itemType) => {
    switch (itemType) {
      case 'epic': return <EpicIcon color="primary" fontSize="small" />;
      case 'story': return <StoryIcon color="info" fontSize="small" />;
      case 'task': return <TaskIcon color="success" fontSize="small" />;
      case 'subtask': return <SubtaskIcon color="warning" fontSize="small" />;
      default: return <TaskIcon fontSize="small" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AI_GENERATED': return 'default';
      case 'IN_REVIEW': return 'warning';
      case 'REVIEWED': return 'info';
      case 'APPROVED': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (!files || files.length === 0) {
    return null; // Don't show anything if no files
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
        Work Items by Source File
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="40"></TableCell>
              <TableCell><strong>Source File / Work Item</strong></TableCell>
              <TableCell width="100"><strong>Type</strong></TableCell>
              <TableCell width="100"><strong>Priority</strong></TableCell>
              <TableCell width="100"><strong>Status</strong></TableCell>
              <TableCell width="120"><strong>Created</strong></TableCell>
              <TableCell width="80"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => {
              const workItems = fileWorkItems[file.id] || [];
              const isExpanded = expandedFiles[file.id];
              
              return (
                <React.Fragment key={file.id}>
                  {/* File Row */}
                  <TableRow 
                    sx={{ 
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleFileExpansion(file.id)}
                        disabled={workItems.length === 0}
                      >
                        {workItems.length > 0 ? (
                          isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                        ) : null}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileIcon color="primary" />
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {file.file_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {workItems.length} work items generated
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label="File" size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(file.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete file">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  {/* Work Items Rows */}
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 1 }}>
                          {workItems.map((item, index) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Table size="small">
                                <TableBody>
                                  <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                    <TableCell width="40"></TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2 }}>
                                        {getItemTypeIcon(item.item_type)}
                                        <Box>
                                          <Typography variant="body2">
                                            {item.title}
                                          </Typography>
                                          {item.description && (
                                            <Typography 
                                              variant="caption" 
                                              color="text.secondary"
                                              sx={{ 
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                              }}
                                            >
                                              {item.description}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                    </TableCell>
                                    <TableCell width="100">
                                      <Chip 
                                        label={item.item_type.toUpperCase()} 
                                        size="small" 
                                        color="primary"
                                        variant="outlined"
                                      />
                                    </TableCell>
                                    <TableCell width="100">
                                      <Chip 
                                        label={item.priority.toUpperCase()} 
                                        size="small" 
                                        color={getPriorityColor(item.priority)}
                                      />
                                    </TableCell>
                                    <TableCell width="100">
                                      <Chip 
                                        label={item.status.replace('_', ' ')} 
                                        size="small" 
                                        color={getStatusColor(item.status)}
                                        variant="outlined"
                                      />
                                    </TableCell>
                                    <TableCell width="120">
                                      <Typography variant="caption">
                                        {formatDate(item.created_at)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell width="80">
                                      {/* Add actions for individual work items if needed */}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </motion.div>
                          ))}
                          
                          {workItems.length === 0 && (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                No work items generated from this file yet
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default WorkItemsByFileComponent;