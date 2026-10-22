// ─────────────────────────────────────────────────────────────────────────────
// api/client.ts — Axios instance for calling our backend
//
// We use an Axios interceptor to automatically attach the JWT token to every
// request. If the backend returns a 401 (Unauthorized), we automatically
// redirect the user to the login page.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';

// 1. Create a configured Axios instance
export const api = axios.create({
  baseURL: '/api',
});

// 2. Add an interceptor for outgoing requests (attach token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trustpay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Add an interceptor for incoming responses (handle 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear it and send user to login
      localStorage.removeItem('trustpay_token');
      // If we aren't already on the login/register page, redirect
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
