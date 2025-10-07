import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { useProjectWorkItems } from '../../contexts/ProjectHierarchyContext';

const ProjectHierarchyDemo = ({ projectId }) => {
  // Single call to load ALL project work items in hierarchy
  const { workItems: epics, loading, error } = useProjectWorkItems(projectId, 'epic');

  if (loading) {
    return <Typography>Loading project hierarchy with single API call...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ✅ Project Hierarchy Loaded with Single API Call
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
        <Typography variant="body2">
          🚀 <strong>Optimization Active:</strong> All work items (epics, stories, tasks) 
          are now cached from one API call to /api/projects/{projectId}/work-items/hierarchy
        </Typography>
      </Paper>

      {epics.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Epics ({epics.length}):
          </Typography>
          {epics.map((epic) => (
            <Box key={epic.id} sx={{ ml: 1, mb: 1 }}>
              <Chip 
                label={`${epic.title} (${epic.children?.length || 0} stories)`}
                color="primary" 
                variant="outlined" 
                size="small"
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ProjectHierarchyDemo;