import api from "../lib/axios";

/**
 * Fetch paginated users with search and role filtering
 * @param {Object} params
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} [params.limit] - Items per page (default: 10)
 * @param {string} [params.search] - Search query by name
 * @param {'ADMIN' | 'USER'} [params.role] - Filter by role
 * @param {string} [params.status] - Filter by status (default: 'active')
 * @returns {Promise<{data: Array, meta: {total: number, page: number, limit: number, totalPages: number}}>}
 */
export async function fetchUsers({
  page = 1,
  limit = 10,
  search = "",
  role = "",
  status = "active",
}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(role && { role: role === "ADMIN" ? "admin" : "user" }),
    ...(status && { status }),
  });

  const response = await api.get("/admin/users", { params });
  
  const data = response?.data;
  const meta = response?.meta;

  return {
    data: Array.isArray(data) ? data : [],
    meta: meta || { total: 0, page: 1, limit: 10, totalPages: 0 },
  };
}

/**
 * Fetch paginated users in the trash (disabled accounts)
 * @param {Object} params
 * @returns {Promise<{data: Array, meta: {total: number, page: number, limit: number, totalPages: number}}>}
 */
export async function fetchTrashUsers({ page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await api.get("/admin/trash", { params });
  
  const users = response?.data?.users;
  const pagination = response?.data?.pagination;

  return {
    data: Array.isArray(users) ? users : [],
    meta: pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
  };
}

/**
 * Soft delete a user (move to trash)
 * @param {string} userId
 */
export async function softDeleteUser(userId) {
  return await api.delete(`/admin/users/${userId}`);
}

/**
 * Restore a soft-deleted user from the trash
 * @param {string} userId
 */
export async function restoreUser(userId) {
  return await api.post(`/admin/users/${userId}/restore`);
}

/**
 * Disable a user account
 * @param {string} userId
 */
export async function disableUser(userId) {
  return await api.post(`/admin/users/${userId}/disable`);
}

/**
 * Enable a user account
 * @param {string} userId
 */
export async function enableUser(userId) {
  return await api.post(`/admin/users/${userId}/enable`);
}
