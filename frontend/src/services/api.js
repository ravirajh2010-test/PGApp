import axios from 'axios';

// Use environment variable for API URL in production, fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('[API] Initialized with base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[API] ✅ Token attached:', token.substring(0, 20) + '...');
  } else {
    console.warn('[API] ⚠️ No token in localStorage for request to:', config.url);
  }
  return config;
});

export default api;