/* api.js — Axios instance with auth interceptor, cold-start retries, and error normalization */
import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com';

export function resolveBackendFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return '';
  const trimmed = fileUrl.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  const cleanBase = API_BASE.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 180000, // 180s (3 minutes) to allow Render free tier wakeups & heavy conversions
  headers: { 'Content-Type': 'application/json' },
});

/* Attach token or default open-workspace guest authorization */
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pk_token') || 'guest_access_token';
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Automatic retry for Render cold starts (502, 503, 504, or Network Errors) */
api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    const status = err.response?.status;

    // Retry up to 3 times on cold-start errors (502, 503, 504, or network timeout/disconnect)
    const isColdStart = !err.response || [502, 503, 504].includes(status);
    if (isColdStart && config && (!config._retryCount || config._retryCount < 3)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const backoffDelay = Math.min(config._retryCount * 2000, 8000); // 2s, 4s, 6s
      window.dispatchEvent(new CustomEvent('pk:waking_server', { detail: { retryCount: config._retryCount } }));
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return api(config);
    }

    const message = err.response?.data?.detail || err.response?.data?.message || err.message || 'An error occurred';

    if (status === 401) {
      localStorage.removeItem('pk_token');
      // In zero-auth mode, silently fall back without interrupting user flow
    }

    const normalized = new Error(message);
    normalized.status = status;
    normalized.data = err.response?.data;
    return Promise.reject(normalized);
  }
);

/**
 * Pre-warm the backend server on application boot
 */
export function prewarmBackend() {
  api.get('/health').catch(() => {
    // Silent catch — just triggering Render wake-up cycle
  });
}

export default api;
