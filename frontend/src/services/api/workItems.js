import { projectsAPI } from './projects.js';

// Work Items API - references methods from projectsAPI for consistency
export const workItemsAPI = {
  // Get work items
  getProjectWorkItems: projectsAPI.getProjectWorkItems,
  getInactiveWorkItems: projectsAPI.getInactiveWorkItems,
  getInactiveChildWorkItems: async (parentId, childType) => {
    // We need to get the project ID from the parent work item first
    const parentItem = await projectsAPI.getWorkItem(parentId);
    const projectId = parentItem.project_id;
    
    const response = await projectsAPI.getProjectWorkItems(projectId, { 
      parent_id: parentId, 
      item_type: childType,
      include_inactive: true 
    });
    // Filter to only inactive items
    return response?.filter(item => item.active === false) || [];
  },
  getWorkItemsHierarchy: projectsAPI.getWorkItemsHierarchy,
  getWorkItemsStats: projectsAPI.getWorkItemsStats,
  getWorkItem: projectsAPI.getWorkItem,

  // CRUD operations
  createWorkItem: projectsAPI.createWorkItem,
  updateWorkItem: projectsAPI.updateWorkItem,
  updateWorkItemStatus: projectsAPI.updateWorkItemStatus,
  deleteWorkItem: projectsAPI.deleteWorkItem,

  // Active status management
  toggleWorkItemActive: projectsAPI.toggleWorkItemActiveStatus,
};

export default workItemsAPI;