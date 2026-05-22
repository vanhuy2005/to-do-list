import axios from "axios";

// API URL
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";

/**
 * Fetch paginated users with search and role filtering
 * @param {Object} params
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} [params.limit] - Items per page (default: 10)
 * @param {string} [params.search] - Search query by name
 * @param {'ADMIN' | 'USER'} [params.role] - Filter by role
 * @returns {Promise<{data: Array, meta: {total: number, page: number, limit: number, totalPages: number}}>}
 */
export async function fetchUsers({
  page = 1,
  limit = 10,
  search = "",
  role = "",
}) {
  try {
    // Build query params
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(role && { role: role === "ADMIN" ? "admin" : "user" }),
    });

    // Primary: try admin endpoint (requires auth)
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        params,
      });
      if (response.data && response.data.success) {
        const data = response.data.data;
        const meta = response.data.meta;
        return {
          data: Array.isArray(data) ? data : [],
          meta: meta || { total: 0, page: 1, limit: 10, totalPages: 0 },
        };
      }
    } catch (err) {
      // fallthrough to try public endpoint on auth errors or not found
      if (!err.response || [401, 403, 404].includes(err.response.status)) {
        // try public endpoint below
      } else {
        throw err;
      }
    }

    // Fallback: public endpoint (no auth required)
    const publicResp = await axios.get(`${API_BASE_URL}/public/users`, {
      params,
    });
    if (publicResp.data && publicResp.data.success) {
      const data = publicResp.data.data;
      const meta = publicResp.data.meta;
      return {
        data: Array.isArray(data) ? data : [],
        meta: meta || { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }
    return publicResp.data;
  } catch (error) {
    // If API fails, return mock data
    console.warn(
      "Failed to fetch users from API, using mock data:",
      error.message,
    );
    return getMockUsers({ page, limit, search, role });
  }
}

/**
 * Mock user data for development
 */
function getMockUsers({ page = 1, limit = 10, search = "", role = "" }) {
  const allUsers = [
    {
      id: "1",
      name: "Nguyễn Văn A",
      role: "ADMIN",
      completedTasks: 24,
      isOnline: true,
      avatarUrl: null,
    },
    {
      id: "2",
      name: "Trần Thị B",
      role: "USER",
      completedTasks: 15,
      isOnline: false,
      avatarUrl: null,
    },
    {
      id: "3",
      name: "Phạm Hoàng C",
      role: "USER",
      completedTasks: 32,
      isOnline: true,
      avatarUrl: null,
    },
    {
      id: "4",
      name: "Lê Quốc D",
      role: "ADMIN",
      completedTasks: 18,
      isOnline: true,
      avatarUrl: null,
    },
    {
      id: "5",
      name: "Đặng Minh E",
      role: "USER",
      completedTasks: 41,
      isOnline: false,
      avatarUrl: null,
    },
    {
      id: "6",
      name: "Vũ Thị F",
      role: "USER",
      completedTasks: 28,
      isOnline: true,
      avatarUrl: null,
    },
    {
      id: "7",
      name: "Bùi Sơn G",
      role: "ADMIN",
      completedTasks: 35,
      isOnline: true,
      avatarUrl: null,
    },
    {
      id: "8",
      name: "Hoàng Anh H",
      role: "USER",
      completedTasks: 12,
      isOnline: false,
      avatarUrl: null,
    },
    {
      id: "9",
      name: "Cao Thanh I",
      role: "USER",
      completedTasks: 45,
      isOnline: true,
      avatarUrl: null,
    },
    {
      id: "10",
      name: "Đinh Bảo J",
      role: "ADMIN",
      completedTasks: 22,
      isOnline: false,
      avatarUrl: null,
    },
    {
      id: "11",
      name: "Giang Thanh K",
      role: "USER",
      completedTasks: 8,
      isOnline: true,
      avatarUrl: null,
    },
    {
      id: "12",
      name: "Hồ Quang L",
      role: "USER",
      completedTasks: 50,
      isOnline: false,
      avatarUrl: null,
    },
  ];

  // Filter by search
  let filtered = allUsers;
  if (search) {
    filtered = filtered.filter((user) =>
      user.name.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Filter by role
  if (role) {
    filtered = filtered.filter((user) => user.role === role);
  }

  // Calculate pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = filtered.slice(startIndex, endIndex);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
