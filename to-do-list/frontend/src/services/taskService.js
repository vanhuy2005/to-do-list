import api from "../lib/axios";

function getTasks(params) {
  return api.get("/tasks", { params });
}

function getTaskById(id) {
  return api.get(`/tasks/${id}`);
}

function createTask(data) {
  return api.post("/tasks", data);
}

function updateTask(id, data) {
  return api.put(`/tasks/${id}`, data);
}

function deleteTask(id) {
  return api.delete(`/tasks/${id}`);
}

function restoreTask(id) {
  return api.post(`/tasks/${id}/restore`);
}

function getDeletedTasks() {
  return api.get("/tasks/trash");
}

const taskService = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
  getDeletedTasks,
};

export default taskService;
