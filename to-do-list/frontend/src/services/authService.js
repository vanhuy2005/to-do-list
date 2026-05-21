import axios from "axios";
import api from "../lib/axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";
const TOKEN_KEY = "token";
const USER_KEY = "auth_user";

const safeParseUser = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

const authService = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  refresh: () => api.post("/auth/refresh"),

  getGoogleAuthUrl: () => `${API_BASE_URL}/auth/google`,

  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),

  setUser: (user) => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getUser: () => safeParseUser(localStorage.getItem(USER_KEY)),

  setSession: ({ token, user }) => {
    if (token) {
      authService.setToken(token);
    }

    if (user) {
      authService.setUser(user);
    }
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  clearToken: () => {
    authService.clearAuth();
  },

  hydrateFromSessionCookie: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/session`, {
        withCredentials: true,
      });

      const data = response?.data?.data;
      if (data?.accessToken && data?.user) {
        authService.setSession({
          token: data.accessToken,
          user: data.user,
        });
        return data;
      }
    } catch {
      authService.clearAuth();
    }

    return null;
  },

  isAuthenticated: () => Boolean(authService.getToken()),

  getRole: () => authService.getUser()?.role || "user",

  getPermissions: () => authService.getUser()?.permissions || [],

  hasPermission: (permission) =>
    authService.getPermissions().includes(permission),

  getDefaultRouteByRole: (role) => (role === "admin" ? "/dashboard" : "/"),
};

export default authService;
