/* api.js — Axios instance with auth interceptor and error normalization */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s for file processing
  headers: { 'Content-Type': 'application/json' },
});

/* Attach JWT token from storage */
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Normalize errors */
api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const message = err.response?.data?.detail || err.response?.data?.message || err.message || 'An error occurred';

    if (status === 401) {
      localStorage.removeItem('pk_token');
      window.dispatchEvent(new CustomEvent('pk:unauthorized'));
    }

    const normalized = new Error(message);
    normalized.status = status;
    normalized.data = err.response?.data;
    return Promise.reject(normalized);
  }
);

export default api;
