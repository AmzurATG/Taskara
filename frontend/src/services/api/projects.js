import apiClient from './client.js';

export const projectsAPI = {
  // Projects CRUD
  getAllProjects: async (includeInactive = false) => {
    const response = await apiClient.get('/api/projects', {
      params: { include_inactive: includeInactive }
    });
    return response.data;
  },

  getProject: async (projectId) => {
    const response = await apiClient.get(`/api/projects/${projectId}`);
    return response.data;
  },

  createProject: async (projectData) => {
    const response = await apiClient.post('/api/projects', projectData);
    return response.data;
  },

  updateProject: async (projectId, projectData) => {
    const response = await apiClient.put(`/api/projects/${projectId}`, projectData);
    return response.data;
  },

  deleteProject: async (projectId) => {
    const response = await apiClient.delete(`/api/projects/${projectId}`);
    return response.data;
  },

  toggleProjectActiveStatus: async (projectId, active) => {
    const response = await apiClient.patch(`/api/projects/${projectId}/toggle-active`, { active });
    return response.data;
  },

  // Work Items CRUD (based on your Postman collection)
  getProjectWorkItems: async (projectId, filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams 
      ? `/api/projects/${projectId}/work-items?${queryParams}`
      : `/api/projects/${projectId}/work-items`;
    const response = await apiClient.get(url);
    return response.data;
  },

  getWorkItemsHierarchy: async (projectId) => {
    const response = await apiClient.get(`/api/projects/${projectId}/work-items/hierarchy`);
    return response.data;
  },

  getWorkItemsStats: async (projectId) => {
    const response = await apiClient.get(`/api/projects/${projectId}/work-items/stats`);
    return response.data;
  },

  getInactiveWorkItems: async (projectId) => {
    const response = await apiClient.get(`/api/projects/${projectId}/work-items/inactive`);
    return response.data;
  },

  // Optimized method for complete project data
  getProjectCompleteData: async (projectId) => {
    try {
      // Try hierarchy endpoint first (most efficient)
      const hierarchyResponse = await apiClient.get(`/api/projects/${projectId}/work-items/hierarchy`);
      return {
        type: 'hierarchy',
        data: hierarchyResponse.data
      };
    } catch (error) {
      console.warn('Hierarchy endpoint failed, falling back to all work items');
      // Fallback to all work items and build hierarchy client-side
      const workItemsResponse = await apiClient.get(`/api/projects/${projectId}/work-items`);
      return {
        type: 'flat',
        data: workItemsResponse.data
      };
    }
  },

  getWorkItem: async (workItemId) => {
    const response = await apiClient.get(`/api/work-items/${workItemId}`);
    return response.data;
  },

  createWorkItem: async (projectId, workItemData) => {
    const response = await apiClient.post(`/api/projects/${projectId}/work-items`, workItemData);
    return response.data;
  },

  updateWorkItem: async (workItemId, workItemData) => {
    const response = await apiClient.put(`/api/work-items/${workItemId}`, workItemData);
    return response.data;
  },

  updateWorkItemStatus: async (workItemId, status) => {
    const response = await apiClient.patch(`/api/work-items/${workItemId}/status`, { status });
    return response.data;
  },

  deleteWorkItem: async (workItemId) => {
    const response = await apiClient.delete(`/api/work-items/${workItemId}`);
    return response.data;
  },

  // File Management
  uploadFile: async (projectId, fileData) => {
    const formData = new FormData();
    formData.append('file', fileData);
    const response = await apiClient.post(`/api/projects/${projectId}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getProjectFiles: async (projectId) => {
    const response = await apiClient.get(`/api/projects/${projectId}/files`);
    return response.data;
  },

  deleteFile: async (fileId) => {
    const response = await apiClient.delete(`/api/files/${fileId}`);
    return response.data;
  },

  getFileWorkItems: async (fileId) => {
    const response = await apiClient.get(`/api/files/${fileId}/work-items`);
    return response.data;
  },

  // AI Jobs
  createAIJob: async (jobData) => {
    const response = await apiClient.post('/api/ai-jobs', jobData);
    return response.data;
  },

  getAIJobStatus: async (jobId) => {
    const response = await apiClient.get(`/api/projects/jobs/${jobId}`);
    return response.data;
  },

  getFileAIJob: async (fileId) => {
    const response = await apiClient.get(`/api/projects/files/${fileId}/job`);
    return response.data;
  },

  getUserAIJobs: async (userId) => {
    const response = await apiClient.get(`/api/ai-jobs/user/${userId}`);
    return response.data;
  },

  // Utility methods for backward compatibility
  getProjectEpics: async (projectId) => {
    // Map to work items with type 'epic'
    const response = await apiClient.get(`/api/projects/${projectId}/work-items?item_type=epic`);
    return response.data;
  },

  getEpic: async (epicId) => {
    // Map to work item
    const response = await apiClient.get(`/api/work-items/${epicId}`);
    return response.data;
  },

  createEpic: async (projectId, epicData) => {
    // Create work item with type 'epic'
    const response = await apiClient.post(`/api/projects/${projectId}/work-items`, {
      ...epicData,
      item_type: 'epic'
    });
    return response.data;
  },

  getEpicStories: async (epicId, projectId) => {
    try {
      console.log('=== Fetching stories for epic ===');
      console.log('Epic ID:', epicId);
      console.log('Project ID:', projectId);
      
      // Use the parent_id filter that's now supported by the backend
      const response = await apiClient.get(`/api/projects/${projectId}/work-items?item_type=story&parent_id=${epicId}`);
      console.log('Direct API response for epic', epicId, ':', response.data);
      
      const stories = response.data || [];
      console.log('✅ Found', stories.length, 'stories for epic', epicId);
      
      return stories;
    } catch (error) {
      console.error('Error fetching epic stories:', error);
      return [];
    }
  },

  getStory: async (storyId) => {
    const response = await apiClient.get(`/api/work-items/${storyId}`);
    return response.data;
  },

  createStory: async (epicId, storyData) => {
    // Create work item with type 'story' and parent_id
    const response = await apiClient.post(`/api/projects/${storyData.projectId}/work-items`, {
      ...storyData,
      item_type: 'story',
      parent_id: epicId
    });
    return response.data;
  },

  getStoryTasks: async (storyId, projectId) => {
    try {
      console.log('=== Fetching tasks for story ===');
      console.log('Story ID:', storyId);
      console.log('Project ID:', projectId);
      
      // Use the parent_id filter that's now supported by the backend
      const response = await apiClient.get(`/api/projects/${projectId}/work-items?item_type=task&parent_id=${storyId}`);
      console.log('Direct API response for story', storyId, ':', response.data);
      
      const tasks = response.data || [];
      console.log('✅ Found', tasks.length, 'tasks for story', storyId);
      
      return tasks;
    } catch (error) {
      console.error('Error fetching story tasks:', error);
      return [];
    }
  },

  getTask: async (taskId) => {
    const response = await apiClient.get(`/api/work-items/${taskId}`);
    return response.data;
  },

  createTask: async (storyId, taskData) => {
    // Create work item with type 'task' and parent_id
    const response = await apiClient.post(`/api/projects/${taskData.projectId}/work-items`, {
      ...taskData,
      item_type: 'task',
      parent_id: storyId
    });
    return response.data;
  },

  getTaskSubtasks: async (taskId, projectId) => {
    try {
      console.log('=== Fetching subtasks for task ===');
      console.log('Task ID:', taskId);
      console.log('Project ID:', projectId);
      
      // Use the parent_id filter that's now supported by the backend
      const response = await apiClient.get(`/api/projects/${projectId}/work-items?item_type=subtask&parent_id=${taskId}`);
      console.log('Direct API response for task', taskId, ':', response.data);
      
      const subtasks = response.data || [];
      console.log('✅ Found', subtasks.length, 'subtasks for task', taskId);
      
      return subtasks;
    } catch (error) {
      console.error('Error fetching task subtasks:', error);
      return [];
    }
  },

  getSubtask: async (subtaskId) => {
    const response = await apiClient.get(`/api/work-items/${subtaskId}`);
    return response.data;
  },

  createSubtask: async (taskId, subtaskData) => {
    // Create work item with type 'subtask' and parent_id
    const response = await apiClient.post(`/api/projects/${subtaskData.projectId}/work-items`, {
      ...subtaskData,
      item_type: 'subtask',
      parent_id: taskId
    });
    return response.data;
  },

  updateSubtask: async (subtaskId, subtaskData) => {
    const response = await apiClient.put(`/api/work-items/${subtaskId}`, subtaskData);
    return response.data;
  },

  deleteSubtask: async (subtaskId) => {
    const response = await apiClient.delete(`/api/work-items/${subtaskId}`);
    return response.data;
  },

  updateEpic: async (epicId, epicData) => {
    const response = await apiClient.put(`/api/work-items/${epicId}`, epicData);
    return response.data;
  },

  deleteEpic: async (epicId) => {
    const response = await apiClient.delete(`/api/work-items/${epicId}`);
    return response.data;
  },

  updateStory: async (storyId, storyData) => {
    const response = await apiClient.put(`/api/work-items/${storyId}`, storyData);
    return response.data;
  },

  deleteStory: async (storyId) => {
    const response = await apiClient.delete(`/api/work-items/${storyId}`);
    return response.data;
  },

  toggleWorkItemActiveStatus: async (workItemId, activeStatus) => {
    const response = await apiClient.patch(`/api/work-items/${workItemId}/toggle-active`, activeStatus);
    return response.data;
  },

  // Additional utility methods
  getProjectStats: async (projectId) => {
    const response = await apiClient.get(`/api/projects/${projectId}/work-items/stats`);
    return response.data;
  },

  searchProjects: async (query) => {
    // This would need backend implementation
    const response = await apiClient.get(`/api/projects?search=${encodeURIComponent(query)}`);
    return response.data;
  },

  getRecentProjects: async () => {
    // This would need backend implementation
    const response = await apiClient.get('/api/projects?recent=true');
    return response.data;
  },
};
