import api from '../lib/axios';

const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  
 
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    }
  },
  
  clearToken: () => {
    localStorage.removeItem('token');
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
};

export default authService;
