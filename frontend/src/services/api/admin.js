import apiClient from './client.js';

export const adminAPI = {
  // Get all users (Admin only)
  async getUsers(params = {}) {
    const { skip = 0, limit = 100, search = '' } = params;
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      queryParams.append('search', search);
    }

    const response = await apiClient.get(`/api/admin/users?${queryParams}`);
    return response.data;
  },

  // Get users count (Admin only)
  async getUsersCount() {
    const response = await apiClient.get('/api/admin/users/count');
    return response.data;
  },

  // Update user role (Admin only)
  async updateUserRole(userId, role) {
    const response = await apiClient.patch(`/api/admin/users/${userId}/role`, {
      role: role
    });
    return response.data;
  },

  // Get specific user (Admin only)
  async getUser(userId) {
    const response = await apiClient.get(`/api/admin/users/${userId}`);
    return response.data;
  },

  // Get users with their projects and statistics (Admin only)
  async getUsersWithProjects() {
    try {
      // Use the new backend endpoint that provides real data
      const response = await apiClient.get('/api/admin/users-with-projects');
      console.log('Fetched real users with projects data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users with projects:', error);
      throw error;
    }
  },

  // Get all projects in the system (Admin only)
  async getAllProjects() {
    try {
      const response = await apiClient.get('/api/admin/all-projects');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all projects:', error);
      throw error;
    }
  },
};