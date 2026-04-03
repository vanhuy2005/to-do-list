import api from '../lib/axios';

const taskService = {
  getTasks: (params = {}) => api.get('/tasks', { params }),
  getTaskById: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  restoreTask: (id) => api.post(`/tasks/${id}/restore`),
  getDeletedTasks: () => api.get('/tasks/trash'),
};

export default taskService;
