import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectsAPI } from '../../services/api/projects.js';

// Async thunks for projects
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (includeInactive = false, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getAllProjects(includeInactive);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch projects');
    }
  }
);

export const fetchProject = createAsyncThunk(
  'projects/fetchProject',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getProject(projectId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch project');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.createProject(projectData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create project');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.updateProject(projectId, projectData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update project');
    }
  }
);

export const updateEpic = createAsyncThunk(
  'projects/updateEpic',
  async ({ id, data, projectId }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.updateWorkItem(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update epic');
    }
  }
);

export const updateStory = createAsyncThunk(
  'projects/updateStory',
  async ({ id, data, projectId }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.updateWorkItem(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update story');
    }
  }
);

export const updateTask = createAsyncThunk(
  'projects/updateTask',
  async ({ id, data, projectId }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.updateWorkItem(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update task');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { rejectWithValue }) => {
    try {
      await projectsAPI.deleteProject(projectId);
      return projectId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete project');
    }
  }
);

// Async thunks for work items (unified approach based on your API)
export const fetchProjectWorkItems = createAsyncThunk(
  'projects/fetchProjectWorkItems',
  async ({ projectId, filters = {} }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getProjectWorkItems(projectId, filters);
      return { projectId, workItems: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch work items');
    }
  }
);

export const fetchWorkItemsHierarchy = createAsyncThunk(
  'projects/fetchWorkItemsHierarchy',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getWorkItemsHierarchy(projectId);
      return { projectId, hierarchy: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch work items hierarchy');
    }
  }
);

export const fetchWorkItemsStats = createAsyncThunk(
  'projects/fetchWorkItemsStats',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getWorkItemsStats(projectId);
      return { projectId, stats: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch work items stats');
    }
  }
);

export const fetchWorkItem = createAsyncThunk(
  'projects/fetchWorkItem',
  async (workItemId, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getWorkItem(workItemId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch work item');
    }
  }
);

export const createWorkItem = createAsyncThunk(
  'projects/createWorkItem',
  async ({ projectId, workItemData }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.createWorkItem(projectId, workItemData);
      return { projectId, workItem: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create work item');
    }
  }
);

export const updateWorkItemStatus = createAsyncThunk(
  'projects/updateWorkItemStatus',
  async ({ workItemId, status }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.updateWorkItemStatus(workItemId, status);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update work item status');
    }
  }
);

// Delete work item thunks
export const deleteWorkItem = createAsyncThunk(
  'projects/deleteWorkItem',
  async (workItemId, { rejectWithValue }) => {
    try {
      await projectsAPI.deleteWorkItem(workItemId);
      return workItemId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete work item');
    }
  }
);

export const deleteEpic = createAsyncThunk(
  'projects/deleteEpic',
  async (epicId, { rejectWithValue }) => {
    try {
      await projectsAPI.deleteEpic(epicId);
      return epicId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete epic');
    }
  }
);

export const deleteStory = createAsyncThunk(
  'projects/deleteStory',
  async (storyId, { rejectWithValue }) => {
    try {
      await projectsAPI.deleteStory(storyId);
      return storyId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete story');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'projects/deleteTask',
  async (taskId, { rejectWithValue }) => {
    try {
      await projectsAPI.deleteTask(taskId);
      return taskId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete task');
    }
  }
);

// Backward compatibility thunks for existing UI
export const fetchProjectEpics = createAsyncThunk(
  'projects/fetchProjectEpics',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getProjectEpics(projectId);
      return { projectId, epics: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch epics');
    }
  }
);

export const fetchEpic = createAsyncThunk(
  'projects/fetchEpic',
  async (epicId, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getEpic(epicId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch epic');
    }
  }
);

export const createEpic = createAsyncThunk(
  'projects/createEpic',
  async ({ projectId, epicData }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.createEpic(projectId, epicData);
      return { projectId, epic: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create epic');
    }
  }
);

export const fetchEpicStories = createAsyncThunk(
  'projects/fetchEpicStories',
  async ({ epicId, projectId }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getEpicStories(epicId, projectId);
      return { epicId, stories: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch stories');
    }
  }
);

export const fetchStory = createAsyncThunk(
  'projects/fetchStory',
  async (storyId, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getStory(storyId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch story');
    }
  }
);

export const fetchStoryTasks = createAsyncThunk(
  'projects/fetchStoryTasks',
  async ({ storyId, projectId }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getStoryTasks(storyId, projectId);
      return { storyId, tasks: response };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch tasks');
    }
  }
);

// Initial state
const initialState = {
  // Projects
  projects: [],
  currentProject: null,
  projectsLoading: false,
  projectsError: null,
  
  // Work Items (unified approach)
  workItems: {}, // { projectId: [workItems] }
  workItemsHierarchy: {}, // { projectId: hierarchicalData }
  workItemsStats: {}, // { projectId: stats }
  currentWorkItem: null,
  workItemsLoading: false,
  workItemsError: null,
  
  // Backward compatibility - Epics, Stories, Tasks
  epics: {}, // { projectId: [epics] }
  currentEpic: null,
  epicsLoading: false,
  epicsError: null,
  
  stories: {}, // { epicId: [stories] }
  currentStory: null,
  storiesLoading: false,
  storiesError: null,
  
  tasks: {}, // { storyId: [tasks] }
  currentTask: null,
  tasksLoading: false,
  tasksError: null,
  
  // UI state
  selectedView: 'list', // list, board, timeline
  filters: {
    status: '',
    assignee: '',
    priority: '',
    item_type: '', // epic, story, task
  },
};

// Projects slice
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    updateCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    },
    clearCurrentWorkItem: (state) => {
      state.currentWorkItem = null;
    },
    clearCurrentEpic: (state) => {
      state.currentEpic = null;
    },
    clearCurrentStory: (state) => {
      state.currentStory = null;
    },
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    setSelectedView: (state, action) => {
      state.selectedView = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        status: '',
        assignee: '',
        priority: '',
        item_type: '',
      };
    },
    clearProjectsError: (state) => {
      state.projectsError = null;
      state.workItemsError = null;
      state.epicsError = null;
      state.storiesError = null;
      state.tasksError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Projects cases
      .addCase(fetchProjects.pending, (state) => {
        state.projectsLoading = true;
        state.projectsError = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projectsLoading = false;
        state.projects = action.payload;
        state.projectsError = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.projectsLoading = false;
        state.projectsError = action.payload;
      })
      
      // Single project cases
      .addCase(fetchProject.pending, (state) => {
        state.projectsLoading = true;
        state.projectsError = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.projectsLoading = false;
        state.currentProject = action.payload;
        state.projectsError = null;
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.projectsLoading = false;
        state.projectsError = action.payload;
      })
      
      // Create project cases
      .addCase(createProject.pending, (state) => {
        state.projectsLoading = true;
        state.projectsError = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projectsLoading = false;
        state.projects.push(action.payload);
        state.projectsError = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.projectsLoading = false;
        state.projectsError = action.payload;
      })
      
      // Update project cases
      .addCase(updateProject.pending, (state) => {
        state.projectsLoading = true;
        state.projectsError = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.projectsLoading = false;
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject && state.currentProject.id === action.payload.id) {
          state.currentProject = action.payload;
        }
        state.projectsError = null;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.projectsLoading = false;
        state.projectsError = action.payload;
      })

      // Update epic cases
      .addCase(updateEpic.pending, (state) => {
        state.epicsLoading = true;
        state.projectsError = null;
      })
      .addCase(updateEpic.fulfilled, (state, action) => {
        state.epicsLoading = false;
        if (state.currentEpic && state.currentEpic.id === action.payload.id) {
          state.currentEpic = action.payload;
        }
        state.projectsError = null;
      })
      .addCase(updateEpic.rejected, (state, action) => {
        state.epicsLoading = false;
        state.projectsError = action.payload;
      })

      // Update story cases
      .addCase(updateStory.pending, (state) => {
        state.storiesLoading = true;
        state.projectsError = null;
      })
      .addCase(updateStory.fulfilled, (state, action) => {
        state.storiesLoading = false;
        // Update story in the stories object
        Object.keys(state.stories).forEach(epicId => {
          const storyIndex = state.stories[epicId].findIndex(s => s.id === action.payload.id);
          if (storyIndex !== -1) {
            state.stories[epicId][storyIndex] = action.payload;
          }
        });
        state.projectsError = null;
      })
      .addCase(updateStory.rejected, (state, action) => {
        state.storiesLoading = false;
        state.projectsError = action.payload;
      })
      
      // Update task cases
      .addCase(updateTask.pending, (state) => {
        state.tasksLoading = true;
        state.projectsError = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.tasksLoading = false;
        // Update task in the tasks object
        Object.keys(state.tasks).forEach(storyId => {
          const taskIndex = state.tasks[storyId].findIndex(t => t.id === action.payload.id);
          if (taskIndex !== -1) {
            state.tasks[storyId][taskIndex] = action.payload;
          }
        });
        // Update currentTask if it matches the updated task
        if (state.currentTask && state.currentTask.id === action.payload.id) {
          state.currentTask = action.payload;
        }
        state.projectsError = null;
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.tasksLoading = false;
        state.projectsError = action.payload;
      })
      
      // Delete project cases
      .addCase(deleteProject.pending, (state) => {
        state.projectsLoading = true;
        state.projectsError = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projectsLoading = false;
        state.projects = state.projects.filter(p => p.id !== action.payload);
        if (state.currentProject && state.currentProject.id === action.payload) {
          state.currentProject = null;
        }
        state.projectsError = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.projectsLoading = false;
        state.projectsError = action.payload;
      })
      
      // Work Items cases
      .addCase(fetchProjectWorkItems.pending, (state) => {
        state.workItemsLoading = true;
        state.workItemsError = null;
      })
      .addCase(fetchProjectWorkItems.fulfilled, (state, action) => {
        state.workItemsLoading = false;
        state.workItems[action.payload.projectId] = action.payload.workItems;
        state.workItemsError = null;
      })
      .addCase(fetchProjectWorkItems.rejected, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsError = action.payload;
      })
      
      .addCase(fetchWorkItemsHierarchy.pending, (state) => {
        state.workItemsLoading = true;
        state.workItemsError = null;
      })
      .addCase(fetchWorkItemsHierarchy.fulfilled, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsHierarchy[action.payload.projectId] = action.payload.hierarchy;
        state.workItemsError = null;
      })
      .addCase(fetchWorkItemsHierarchy.rejected, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsError = action.payload;
      })
      
      .addCase(fetchWorkItemsStats.pending, (state) => {
        state.workItemsLoading = true;
        state.workItemsError = null;
      })
      .addCase(fetchWorkItemsStats.fulfilled, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsStats[action.payload.projectId] = action.payload.stats;
        state.workItemsError = null;
      })
      .addCase(fetchWorkItemsStats.rejected, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsError = action.payload;
      })
      
      .addCase(fetchWorkItem.pending, (state) => {
        state.workItemsLoading = true;
        state.workItemsError = null;
      })
      .addCase(fetchWorkItem.fulfilled, (state, action) => {
        state.workItemsLoading = false;
        state.currentWorkItem = action.payload;
        state.workItemsError = null;
      })
      .addCase(fetchWorkItem.rejected, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsError = action.payload;
      })
      
      .addCase(createWorkItem.pending, (state) => {
        state.workItemsLoading = true;
        state.workItemsError = null;
      })
      .addCase(createWorkItem.fulfilled, (state, action) => {
        state.workItemsLoading = false;
        const { projectId, workItem } = action.payload;
        if (state.workItems[projectId]) {
          state.workItems[projectId].push(workItem);
        }
        state.workItemsError = null;
      })
      .addCase(createWorkItem.rejected, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsError = action.payload;
      })
      
      // Delete work item cases
      .addCase(deleteWorkItem.pending, (state) => {
        state.workItemsLoading = true;
        state.workItemsError = null;
      })
      .addCase(deleteWorkItem.fulfilled, (state, action) => {
        state.workItemsLoading = false;
        const deletedId = action.payload;
        
        // Remove from workItems arrays in all projects
        Object.keys(state.workItems).forEach(projectId => {
          state.workItems[projectId] = state.workItems[projectId].filter(item => item.id !== deletedId);
        });
        
        // Clear current work item if it was deleted
        if (state.currentWorkItem && state.currentWorkItem.id === deletedId) {
          state.currentWorkItem = null;
        }
        
        state.workItemsError = null;
      })
      .addCase(deleteWorkItem.rejected, (state, action) => {
        state.workItemsLoading = false;
        state.workItemsError = action.payload;
      })
      
      .addCase(deleteEpic.pending, (state) => {
        state.epicsLoading = true;
        state.epicsError = null;
      })
      .addCase(deleteEpic.fulfilled, (state, action) => {
        state.epicsLoading = false;
        const deletedId = action.payload;
        
        // Remove from epics arrays in all projects
        Object.keys(state.epics).forEach(projectId => {
          state.epics[projectId] = state.epics[projectId].filter(epic => epic.id !== deletedId);
        });
        
        // Remove from workItems arrays as well
        Object.keys(state.workItems).forEach(projectId => {
          state.workItems[projectId] = state.workItems[projectId].filter(item => item.id !== deletedId);
        });
        
        // Clear current epic if it was deleted
        if (state.currentEpic && state.currentEpic.id === deletedId) {
          state.currentEpic = null;
        }
        
        state.epicsError = null;
      })
      .addCase(deleteEpic.rejected, (state, action) => {
        state.epicsLoading = false;
        state.epicsError = action.payload;
      })
      
      .addCase(deleteStory.pending, (state) => {
        state.storiesLoading = true;
        state.storiesError = null;
      })
      .addCase(deleteStory.fulfilled, (state, action) => {
        state.storiesLoading = false;
        const deletedId = action.payload;
        
        // Remove from stories arrays in all epics
        Object.keys(state.stories).forEach(epicId => {
          state.stories[epicId] = state.stories[epicId].filter(story => story.id !== deletedId);
        });
        
        // Remove from workItems arrays as well
        Object.keys(state.workItems).forEach(projectId => {
          state.workItems[projectId] = state.workItems[projectId].filter(item => item.id !== deletedId);
        });
        
        // Clear current story if it was deleted
        if (state.currentStory && state.currentStory.id === deletedId) {
          state.currentStory = null;
        }
        
        state.storiesError = null;
      })
      .addCase(deleteStory.rejected, (state, action) => {
        state.storiesLoading = false;
        state.storiesError = action.payload;
      })
      
      .addCase(deleteTask.pending, (state) => {
        state.tasksLoading = true;
        state.tasksError = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasksLoading = false;
        const deletedId = action.payload;
        
        // Remove from tasks arrays in all stories
        Object.keys(state.tasks).forEach(storyId => {
          state.tasks[storyId] = state.tasks[storyId].filter(task => task.id !== deletedId);
        });
        
        // Remove from workItems arrays as well
        Object.keys(state.workItems).forEach(projectId => {
          state.workItems[projectId] = state.workItems[projectId].filter(item => item.id !== deletedId);
        });
        
        // Clear current task if it was deleted
        if (state.currentTask && state.currentTask.id === deletedId) {
          state.currentTask = null;
        }
        
        state.tasksError = null;
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.tasksLoading = false;
        state.tasksError = action.payload;
      })
      
      // Backward compatibility - Epics cases
      .addCase(fetchProjectEpics.pending, (state) => {
        state.epicsLoading = true;
        state.epicsError = null;
      })
      .addCase(fetchProjectEpics.fulfilled, (state, action) => {
        state.epicsLoading = false;
        state.epics[action.payload.projectId] = action.payload.epics;
        state.epicsError = null;
      })
      .addCase(fetchProjectEpics.rejected, (state, action) => {
        state.epicsLoading = false;
        state.epicsError = action.payload;
      })
      
      // Single epic cases
      .addCase(fetchEpic.pending, (state) => {
        state.epicsLoading = true;
        state.epicsError = null;
      })
      .addCase(fetchEpic.fulfilled, (state, action) => {
        state.epicsLoading = false;
        state.currentEpic = action.payload;
        state.epicsError = null;
      })
      .addCase(fetchEpic.rejected, (state, action) => {
        state.epicsLoading = false;
        state.epicsError = action.payload;
      })
      
      // Stories cases
      .addCase(fetchEpicStories.pending, (state) => {
        state.storiesLoading = true;
        state.storiesError = null;
      })
      .addCase(fetchEpicStories.fulfilled, (state, action) => {
        state.storiesLoading = false;
        state.stories[action.payload.epicId] = action.payload.stories;
        state.storiesError = null;
      })
      .addCase(fetchEpicStories.rejected, (state, action) => {
        state.storiesLoading = false;
        state.storiesError = action.payload;
      })
      
      // Single story cases
      .addCase(fetchStory.pending, (state) => {
        state.storiesLoading = true;
        state.storiesError = null;
      })
      .addCase(fetchStory.fulfilled, (state, action) => {
        state.storiesLoading = false;
        state.currentStory = action.payload;
        state.storiesError = null;
      })
      .addCase(fetchStory.rejected, (state, action) => {
        state.storiesLoading = false;
        state.storiesError = action.payload;
      })
      
      // Tasks cases
      .addCase(fetchStoryTasks.pending, (state) => {
        state.tasksLoading = true;
        state.tasksError = null;
      })
      .addCase(fetchStoryTasks.fulfilled, (state, action) => {
        state.tasksLoading = false;
        state.tasks[action.payload.storyId] = action.payload.tasks;
        state.tasksError = null;
      })
      .addCase(fetchStoryTasks.rejected, (state, action) => {
        state.tasksLoading = false;
        state.tasksError = action.payload;
      });
  },
});

export const {
  clearCurrentProject,
  updateCurrentProject,
  clearCurrentWorkItem,
  clearCurrentEpic,
  clearCurrentStory,
  clearCurrentTask,
  setSelectedView,
  setFilters,
  clearFilters,
  clearProjectsError,
} = projectsSlice.actions;

export default projectsSlice.reducer;
