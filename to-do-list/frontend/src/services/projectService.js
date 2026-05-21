import api from "@/lib/axios";

export default {
  getProjects() {
    return api.get("/projects");
  },

  createProject(payload) {
    return api.post("/projects", payload);
  },

  getProject(id) {
    return api.get(`/projects/${id}`);
  },

  updateProject(id, payload) {
    return api.patch(`/projects/${id}`, payload);
  },

  deleteProject(id) {
    return api.delete(`/projects/${id}`);
  },

  addMember(projectId, payload) {
    return api.post(`/projects/${projectId}/members`, payload);
  },

  updateMember(projectId, memberId, payload) {
    return api.patch(`/projects/${projectId}/members/${memberId}`, payload);
  },

  removeMember(projectId, memberId) {
    return api.delete(`/projects/${projectId}/members/${memberId}`);
  },

  createShareLink(projectId, payload) {
    return api.post(`/projects/${projectId}/share-links`, payload);
  },

  joinByLink(token) {
    return api.post(`/projects/join/${token}`);
  },
};
