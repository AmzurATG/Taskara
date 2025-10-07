import apiClient from './client';

// RAG API endpoints
const ragAPI = {
  // Get project documents
  getProjectDocuments: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/rag/projects/${projectId}/documents`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project documents:', error);
      throw error;
    }
  },

  // Chat with document
  chatWithDocument: async (projectId, query, fileId) => {
    try {
      const response = await apiClient.post(`/api/rag/projects/${projectId}/chat`, {
        query,
        file_id: fileId
      });
      return response.data;
    } catch (error) {
      console.error('Error chatting with document:', error);
      throw error;
    }
  },

  // Index a document
  indexDocument: async (projectId, fileId) => {
    try {
      const response = await apiClient.post(`/api/rag/projects/${projectId}/documents/${fileId}/index`);
      return response.data;
    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }
};

export { ragAPI };