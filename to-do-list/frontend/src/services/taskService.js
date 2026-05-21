import api from "../lib/axios";

const taskService = {
  getTasks: (params = {}) => api.get("/tasks", { params }),
  getTaskById: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post("/tasks", data),
  createVoiceDraft: (data) => api.post("/voice-task", data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  restoreTask: (id) => api.post(`/tasks/${id}/restore`),
  getDeletedTasks: () => api.get("/tasks/trash"),
  getTaskShares: (id) => api.get(`/tasks/${id}/shares`),
  shareTask: (id, data) => api.post(`/tasks/${id}/shares`, data),
  updateTaskShare: (id, collaboratorId, data) =>
    api.patch(`/tasks/${id}/shares/${collaboratorId}`, data),
  removeTaskShare: (id, collaboratorId) =>
    api.delete(`/tasks/${id}/shares/${collaboratorId}`),
};

export default taskService;
