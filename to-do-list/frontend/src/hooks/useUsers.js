import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "../services/users.api";

/**
 * Custom hook to fetch and manage paginated users with search and role filtering
 * @param {Object} options
 * @param {number} [options.page] - Current page (1-indexed)
 * @param {string} [options.search] - Search query
 * @param {'ADMIN' | 'USER'} [options.role] - Role filter
 * @param {number} [options.limit] - Items per page
 * @returns {Object} - Query result with data, loading, error states
 */
export function useUsers({
  page = 1,
  search = "",
  role = "",
  limit = 10,
} = {}) {
  return useQuery({
    queryKey: ["users", { page, search, role, limit }],
    queryFn: () => fetchUsers({ page, limit, search, role }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
