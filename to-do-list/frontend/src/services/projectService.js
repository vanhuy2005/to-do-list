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

  restoreProject(id) {
    return api.post(`/projects/${id}/restore`);
  },

  purgeProject(id) {
    return api.delete(`/projects/${id}/purge`);
  },

  archiveProject(id) {
    return api.post(`/projects/${id}/archive`);
  },

  unarchiveProject(id) {
    return api.post(`/projects/${id}/unarchive`);
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

  leaveProject(projectId) {
    return api.post(`/projects/${projectId}/leave`);
  },

  transferOwnership(projectId, targetUserId) {
    return api.patch(`/projects/${projectId}/transfer`, { targetUserId });
  },

  createShareLink(projectId, payload) {
    return api.post(`/projects/${projectId}/share-links`, payload);
  },

  revokeShareLink(projectId, linkId) {
    return api.delete(`/projects/${projectId}/share-links/${linkId}`);
  },

  generateInviteCode(projectId, payload) {
    return api.post(`/projects/${projectId}/invite-code`, payload);
  },

  revokeInviteCode(projectId) {
    return api.delete(`/projects/${projectId}/invite-code`);
  },

  joinByLink(token) {
    return api.post("/projects/join/link", { token });
  },

  joinByCode(code) {
    return api.post("/projects/join/code", { code });
  },

  getActivityFeed(projectId) {
    return api.get(`/projects/${projectId}/activity`);
  },
};
