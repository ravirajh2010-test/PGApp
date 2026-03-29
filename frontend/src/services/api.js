import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to get current org slug from localStorage
export const getOrgSlug = () => {
  const org = localStorage.getItem('organization');
  if (org) {
    try {
      return JSON.parse(org).slug;
    } catch {
      return null;
    }
  }
  return null;
};

// Helper to get current org info
export const getOrganization = () => {
  const org = localStorage.getItem('organization');
  if (org) {
    try {
      return JSON.parse(org);
    } catch {
      return null;
    }
  }
  return null;
};

// Auth helpers
export const setAuthData = (token, user, organization) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  if (organization) {
    localStorage.setItem('organization', JSON.stringify(organization));
  }
};

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('organization');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  }
  return null;
};

export default api;