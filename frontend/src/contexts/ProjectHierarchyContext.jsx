import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { projectsAPI } from '../services/api/projects';

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_HIERARCHY: 'SET_HIERARCHY',
  SET_ERROR: 'SET_ERROR',
  CLEAR_PROJECT: 'CLEAR_PROJECT',
  UPDATE_WORK_ITEM: 'UPDATE_WORK_ITEM',
};

// Initial state
const initialState = {
  hierarchyCache: {}, // projectId -> hierarchy data
  loading: {},        // projectId -> boolean
  errors: {},         // projectId -> error message
};

// Reducer
const hierarchyReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.projectId]: action.loading,
        },
        errors: {
          ...state.errors,
          [action.projectId]: null,
        },
      };

    case ACTIONS.SET_HIERARCHY:
      return {
        ...state,
        hierarchyCache: {
          ...state.hierarchyCache,
          [action.projectId]: {
            data: action.hierarchy,
            timestamp: Date.now(),
          },
        },
        loading: {
          ...state.loading,
          [action.projectId]: false,
        },
        errors: {
          ...state.errors,
          [action.projectId]: null,
        },
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.projectId]: false,
        },
        errors: {
          ...state.errors,
          [action.projectId]: action.error,
        },
      };

    case ACTIONS.CLEAR_PROJECT:
      const newHierarchyCache = { ...state.hierarchyCache };
      const newLoading = { ...state.loading };
      const newErrors = { ...state.errors };
      
      delete newHierarchyCache[action.projectId];
      delete newLoading[action.projectId];
      delete newErrors[action.projectId];

      return {
        ...state,
        hierarchyCache: newHierarchyCache,
        loading: newLoading,
        errors: newErrors,
      };

    case ACTIONS.UPDATE_WORK_ITEM:
      const projectHierarchy = state.hierarchyCache[action.projectId];
      if (!projectHierarchy) return state;

      // Update work item in hierarchy
      const updateWorkItemInHierarchy = (items, updatedItem) => {
        return items.map(item => {
          if (item.id === updatedItem.id) {
            return { ...item, ...updatedItem };
          }
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: updateWorkItemInHierarchy(item.children, updatedItem),
            };
          }
          return item;
        });
      };

      return {
        ...state,
        hierarchyCache: {
          ...state.hierarchyCache,
          [action.projectId]: {
            ...projectHierarchy,
            data: updateWorkItemInHierarchy(projectHierarchy.data, action.workItem),
          },
        },
      };

    default:
      return state;
  }
};

// Context
const ProjectHierarchyContext = createContext();

// Provider component
export const ProjectHierarchyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(hierarchyReducer, initialState);

  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Check if data is fresh
  const isDataFresh = useCallback((projectId) => {
    const cached = state.hierarchyCache[projectId];
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < CACHE_DURATION;
  }, [state.hierarchyCache]);

  // Fetch hierarchy data
  const fetchHierarchy = useCallback(async (projectId, forceRefresh = false) => {
    // Return cached data if fresh and not forcing refresh
    if (!forceRefresh && isDataFresh(projectId)) {
      return state.hierarchyCache[projectId].data;
    }

    dispatch({ type: ACTIONS.SET_LOADING, projectId, loading: true });

    try {
      // Use regular API
      const hierarchy = await projectsAPI.getWorkItemsHierarchy(projectId);
      
      dispatch({ 
        type: ACTIONS.SET_HIERARCHY, 
        projectId, 
        hierarchy 
      });

      return hierarchy;
    } catch (error) {
      const errorMessage = error.response?.status 
        ? `${error.response.status}: ${error.message || 'Failed to fetch project hierarchy'}` 
        : error.message || 'Failed to fetch project hierarchy';
        
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        projectId, 
        error: errorMessage 
      });
      throw error;
    }
  }, [isDataFresh, state.hierarchyCache]);

  // Get cached hierarchy data
  const getHierarchy = useCallback((projectId) => {
    return state.hierarchyCache[projectId]?.data || null;
  }, [state.hierarchyCache]);

  // Get specific work item from hierarchy
  const getWorkItem = useCallback((projectId, workItemId) => {
    const hierarchy = getHierarchy(projectId);
    if (!hierarchy) return null;

    const findWorkItem = (items, id) => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findWorkItem(item.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    return findWorkItem(hierarchy, workItemId);
  }, [getHierarchy]);

  // Get children of a work item
  const getWorkItemChildren = useCallback((projectId, workItemId) => {
    const workItem = getWorkItem(projectId, workItemId);
    return workItem?.children || [];
  }, [getWorkItem]);

  // Get work items by type
  const getWorkItemsByType = useCallback((projectId, itemType, parentId = null) => {
    const hierarchy = getHierarchy(projectId);
    if (!hierarchy) {
      console.log(`[ProjectHierarchy] No hierarchy found for project ${projectId}`);
      return [];
    }

    console.log(`[ProjectHierarchy] Searching for items of type "${itemType}" with parentId "${parentId}" in project ${projectId}`);
    console.log(`[ProjectHierarchy] Hierarchy structure:`, hierarchy);

    const collectItemsByType = (items, type, targetParentId = null) => {
      let results = [];
      
      for (const item of items) {
        // If we're looking for children of a specific parent
        if (targetParentId !== null) {
          if (item.id === targetParentId && item.children) {
            // Found the parent - get its children of the specified type
            results = item.children.filter(child => child.type === type);
            console.log(`[ProjectHierarchy] Found parent ${targetParentId}, returning ${results.length} children of type "${type}"`);
            return results; // Return immediately since we found what we're looking for
          }
        } 
        // If we're looking for all items of a type (targetParentId === null)
        else {
          if (item.type === type) {
            results.push(item);
          }
        }
        
        // Recursively search children (only if we haven't found our target parent yet)
        if (item.children && item.children.length > 0) {
          const childResults = collectItemsByType(item.children, type, targetParentId);
          if (targetParentId !== null && childResults.length > 0) {
            // If we were looking for a specific parent and found results, return them
            return childResults;
          }
          results = results.concat(childResults);
        }
      }
      
      return results;
    };

    return collectItemsByType(hierarchy, itemType, parentId);
  }, [getHierarchy]);

  // Update work item in cache
  const updateWorkItem = useCallback((projectId, workItem) => {
    dispatch({
      type: ACTIONS.UPDATE_WORK_ITEM,
      projectId,
      workItem,
    });
  }, []);

  // Clear project data
  const clearProject = useCallback((projectId) => {
    dispatch({ type: ACTIONS.CLEAR_PROJECT, projectId });
  }, []);

  // Get loading state
  const isLoading = useCallback((projectId) => {
    return state.loading[projectId] || false;
  }, [state.loading]);

  // Get error state
  const getError = useCallback((projectId) => {
    return state.errors[projectId] || null;
  }, [state.errors]);

  const contextValue = {
    // Data access
    getHierarchy,
    getWorkItem,
    getWorkItemChildren,
    getWorkItemsByType,
    
    // Actions
    fetchHierarchy,
    updateWorkItem,
    clearProject,
    
    // State
    isLoading,
    getError,
    isDataFresh,
  };

  return (
    <ProjectHierarchyContext.Provider value={contextValue}>
      {children}
    </ProjectHierarchyContext.Provider>
  );
};

// Hook to use the context
export const useProjectHierarchy = () => {
  const context = useContext(ProjectHierarchyContext);
  if (!context) {
    throw new Error('useProjectHierarchy must be used within a ProjectHierarchyProvider');
  }
  return context;
};

// Helper hooks for common use cases
export const useProjectWorkItems = (projectId, itemType = null, parentId = null) => {
  const {
    getHierarchy,
    getWorkItemsByType,
    fetchHierarchy,
    isLoading,
    getError,
  } = useProjectHierarchy();

  const [needsLoad, setNeedsLoad] = React.useState(false);

  // Check if we need to load data
  React.useEffect(() => {
    if (!projectId) return;
    
    try {
      const hierarchy = getHierarchy(projectId);
      const error = getError(projectId);
      
      // Don't retry if we have authentication/authorization errors
      if (error && (error.includes('401') || error.includes('403'))) {
        console.log(`[ProjectHierarchy] Skipping load due to auth error for project ${projectId}: ${error}`);
        return;
      }
      
      if (!hierarchy && !isLoading(projectId)) {
        console.log(`[ProjectHierarchy] Need to load data for project ${projectId}`);
        setNeedsLoad(true);
      }
    } catch (error) {
      console.error('[ProjectHierarchy] Error checking if data needs loading:', error);
    }
  }, [projectId, getHierarchy, isLoading, getError]);

  // Load data if needed
  React.useEffect(() => {
    if (needsLoad && projectId) {
      console.log(`[ProjectHierarchy] Loading hierarchy for project ${projectId}`);
      fetchHierarchy(projectId)
        .then(() => {
          console.log(`[ProjectHierarchy] Successfully loaded hierarchy for project ${projectId}`);
        })
        .catch((error) => {
          console.error(`[ProjectHierarchy] Failed to load hierarchy for project ${projectId}:`, error);
          // For auth errors, don't retry (redirect will happen via interceptor)
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.log(`[ProjectHierarchy] Not retrying due to auth error (${error.response.status}) for project ${projectId}`);
          }
        })
        .finally(() => setNeedsLoad(false));
    }
  }, [needsLoad, projectId, fetchHierarchy]);

  // Get work items
  const workItems = React.useMemo(() => {
    if (!projectId) return [];
    
    try {
      if (itemType) {
        const items = getWorkItemsByType(projectId, itemType, parentId);
        console.log(`[ProjectHierarchy] Got ${items.length} items of type "${itemType}" for project ${projectId}`, items);
        return items;
      } else {
        const hierarchy = getHierarchy(projectId);
        console.log(`[ProjectHierarchy] Got hierarchy for project ${projectId}:`, hierarchy);
        return hierarchy || [];
      }
    } catch (error) {
      console.error('[ProjectHierarchy] Error getting work items:', error);
      return [];
    }
  }, [projectId, itemType, parentId, getWorkItemsByType, getHierarchy]);

  return {
    workItems,
    loading: isLoading(projectId),
    error: getError(projectId),
    refetch: () => fetchHierarchy(projectId, true),
  };
};

export const useWorkItem = (projectId, workItemId) => {
  const { getWorkItem, fetchHierarchy, isLoading, getError } = useProjectHierarchy();
  
  const [needsLoad, setNeedsLoad] = React.useState(false);

  // Check if we need to load data
  React.useEffect(() => {
    const workItem = getWorkItem(projectId, workItemId);
    const error = getError(projectId);
    
    // Don't retry if we have authentication/authorization errors
    if (error && (error.includes('401') || error.includes('403'))) {
      console.log(`[ProjectHierarchy] Skipping load due to auth error for work item ${workItemId}: ${error}`);
      return;
    }
    
    if (!workItem && !isLoading(projectId)) {
      setNeedsLoad(true);
    }
  }, [projectId, workItemId, getWorkItem, isLoading, getError]);

  // Load data if needed
  React.useEffect(() => {
    if (needsLoad) {
      fetchHierarchy(projectId)
        .catch((error) => {
          console.error(`[ProjectHierarchy] Failed to load hierarchy for work item ${workItemId}:`, error);
          // For auth errors, don't retry (redirect will happen via interceptor)
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.log(`[ProjectHierarchy] Not retrying due to auth error (${error.response.status}) for work item ${workItemId}`);
          }
        })
        .finally(() => setNeedsLoad(false));
    }
  }, [needsLoad, projectId, workItemId, fetchHierarchy]);

  const workItem = getWorkItem(projectId, workItemId);

  return {
    workItem,
    loading: isLoading(projectId) || needsLoad,
    error: getError(projectId),
    refetch: () => fetchHierarchy(projectId, true),
  };
};