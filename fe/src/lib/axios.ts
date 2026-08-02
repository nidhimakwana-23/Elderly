import axios from 'axios';
import { AUTH_TOKEN_KEY } from './constants';

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT from localStorage ───────────────────────
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: surface a clean error message ─────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export default axiosInstance;
