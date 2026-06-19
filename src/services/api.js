import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://thestory-be.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ts_token') || sessionStorage.getItem('ts_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ts_token');
      localStorage.removeItem('ts_user');
      sessionStorage.removeItem('ts_token');
      sessionStorage.removeItem('ts_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
