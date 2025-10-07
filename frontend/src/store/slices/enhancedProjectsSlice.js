// Enhanced projects slice with smart caching
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectsAPI } from '../services/api/projects.js';

// Cache-aware thunk for fetching project work items
export const fetchProjectWorkItemsCached = createAsyncThunk(
  'projects/fetchProjectWorkItemsCached',
  async ({ projectId, filters = {}, forceRefresh = false }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const cacheKey = `${projectId}-${JSON.stringify(filters)}`;
      
      // Check if data exists and is recent (unless force refresh)
      if (!forceRefresh && state.projects.workItemsCache[cacheKey]) {
        const cached = state.projects.workItemsCache[cacheKey];
        const isRecent = Date.now() - cached.timestamp < 5 * 60 * 1000; // 5 minutes
        
        if (isRecent) {
          return { projectId, workItems: cached.data, fromCache: true };
        }
      }
      
      // Fetch fresh data
      const response = await projectsAPI.getProjectWorkItems(projectId, filters);
      return { 
        projectId, 
        workItems: response, 
        fromCache: false,
        cacheKey,
        timestamp: Date.now()
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch work items');
    }
  }
);

// Optimized thunk for hierarchical data fetching
export const fetchProjectDataOptimized = createAsyncThunk(
  'projects/fetchProjectDataOptimized',
  async ({ projectId, depth = 'all' }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const results = {};
      
      // Check what data we already have
      const hasEpics = state.projects.workItems[projectId]?.some(item => item.item_type === 'epic');
      
      if (!hasEpics || depth === 'all') {
        // Fetch all work items in one call
        const allWorkItems = await projectsAPI.getProjectWorkItems(projectId, {});
        
        // Organize data by type
        const organized = {
          epics: allWorkItems.filter(item => item.item_type === 'epic' && !item.parent_id),
          stories: {},
          tasks: {}
        };
        
        // Group stories by epic
        allWorkItems
          .filter(item => item.item_type === 'story')
          .forEach(story => {
            if (!organized.stories[story.parent_id]) {
              organized.stories[story.parent_id] = [];
            }
            organized.stories[story.parent_id].push(story);
          });
        
        // Group tasks by story
        allWorkItems
          .filter(item => item.item_type === 'task')
          .forEach(task => {
            if (!organized.tasks[task.parent_id]) {
              organized.tasks[task.parent_id] = [];
            }
            organized.tasks[task.parent_id].push(task);
          });
        
        return { projectId, organized, allWorkItems };
      }
      
      return { projectId, fromCache: true };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch project data');
    }
  }
);

const enhancedProjectsSlice = createSlice({
  name: 'enhancedProjects',
  initialState: {
    // Organized data structure
    projectData: {}, // { projectId: { epics: [], stories: {}, tasks: {} } }
    
    // Cache management
    workItemsCache: {}, // { cacheKey: { data, timestamp } }
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
    
    // Loading states
    dataLoading: {}, // { projectId: boolean }
    
    // Performance metrics
    cacheHits: 0,
    cacheMisses: 0,
    
    error: null,
  },
  reducers: {
    // Cache management
    clearCache: (state) => {
      state.workItemsCache = {};
      state.cacheHits = 0;
      state.cacheMisses = 0;
    },
    
    clearProjectCache: (state, action) => {
      const projectId = action.payload;
      delete state.projectData[projectId];
      
      // Clear related cache entries
      Object.keys(state.workItemsCache).forEach(key => {
        if (key.startsWith(`${projectId}-`)) {
          delete state.workItemsCache[key];
        }
      });
    },
    
    // Performance tracking
    incrementCacheHits: (state) => {
      state.cacheHits++;
    },
    
    incrementCacheMisses: (state) => {
      state.cacheMisses++;
    },
    
    // Update specific work item
    updateWorkItemOptimized: (state, action) => {
      const { projectId, workItem } = action.payload;
      const projectData = state.projectData[projectId];
      
      if (projectData) {
        switch (workItem.item_type) {
          case 'epic':
            const epicIndex = projectData.epics.findIndex(e => e.id === workItem.id);
            if (epicIndex >= 0) {
              projectData.epics[epicIndex] = workItem;
            }
            break;
          case 'story':
            if (projectData.stories[workItem.parent_id]) {
              const storyIndex = projectData.stories[workItem.parent_id].findIndex(s => s.id === workItem.id);
              if (storyIndex >= 0) {
                projectData.stories[workItem.parent_id][storyIndex] = workItem;
              }
            }
            break;
          case 'task':
            if (projectData.tasks[workItem.parent_id]) {
              const taskIndex = projectData.tasks[workItem.parent_id].findIndex(t => t.id === workItem.id);
              if (taskIndex >= 0) {
                projectData.tasks[workItem.parent_id][taskIndex] = workItem;
              }
            }
            break;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectWorkItemsCached.pending, (state, action) => {
        const { projectId } = action.meta.arg;
        state.dataLoading[projectId] = true;
      })
      .addCase(fetchProjectWorkItemsCached.fulfilled, (state, action) => {
        const { projectId, workItems, fromCache, cacheKey, timestamp } = action.payload;
        state.dataLoading[projectId] = false;
        
        if (fromCache) {
          state.cacheHits++;
        } else {
          state.cacheMisses++;
          // Update cache
          if (cacheKey) {
            state.workItemsCache[cacheKey] = { data: workItems, timestamp };
          }
        }
      })
      .addCase(fetchProjectDataOptimized.fulfilled, (state, action) => {
        const { projectId, organized, allWorkItems } = action.payload;
        state.dataLoading[projectId] = false;
        
        if (organized) {
          state.projectData[projectId] = organized;
          // Cache all work items
          const cacheKey = `${projectId}-all`;
          state.workItemsCache[cacheKey] = {
            data: allWorkItems,
            timestamp: Date.now()
          };
        }
      });
  },
});

// Optimized selectors
export const selectProjectEpicsOptimized = (state, projectId) =>
  state.enhancedProjects.projectData[projectId]?.epics || [];

export const selectEpicStoriesOptimized = (state, projectId, epicId) =>
  state.enhancedProjects.projectData[projectId]?.stories[epicId] || [];

export const selectStoryTasksOptimized = (state, projectId, storyId) =>
  state.enhancedProjects.projectData[projectId]?.tasks[storyId] || [];

export const selectCacheStats = (state) => ({
  hits: state.enhancedProjects.cacheHits,
  misses: state.enhancedProjects.cacheMisses,
  hitRate: state.enhancedProjects.cacheHits / (state.enhancedProjects.cacheHits + state.enhancedProjects.cacheMisses) * 100
});

export const {
  clearCache,
  clearProjectCache,
  incrementCacheHits,
  incrementCacheMisses,
  updateWorkItemOptimized,
} = enhancedProjectsSlice.actions;

export default enhancedProjectsSlice.reducer;