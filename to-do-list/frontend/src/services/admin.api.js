import api from "../lib/axios";

/**
 * Fetch paginated audit logs with search, action, entityType, and date filtering
 * @param {Object} params
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} [params.limit] - Items per page (default: 20)
 * @param {string} [params.search] - Search keyword
 * @param {string} [params.action] - Exact action filter
 * @param {string} [params.entityType] - Exact entityType filter
 * @param {string} [params.from] - Start date
 * @param {string} [params.to] - End date
 * @returns {Promise<{logs: Array, pagination: {total: number, page: number, limit: number, totalPages: number}}>}
 */
export async function fetchAuditLogs({
  page = 1,
  limit = 20,
  search = "",
  action = "",
  entityType = "",
  from = "",
  to = "",
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(from && { from }),
    ...(to && { to }),
  });

  const response = await api.get("/admin/audit-logs", { params });

  const logs = response?.data?.logs;
  const pagination = response?.data?.pagination;

  return {
    logs: Array.isArray(logs) ? logs : [],
    pagination: pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
  };
}
