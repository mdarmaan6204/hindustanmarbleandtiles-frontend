import axios from 'axios';
import { apiConfig, apiLogger, retryWithBackoff } from '../config/apiConfig.js';

/**
 * Centralized Axios instance
 * Uses configuration from apiConfig.js
 * Automatically uses VITE_API_URL from .env
 */
const api = axios.create({
  baseURL: apiConfig.API_ENDPOINT,
  timeout: apiConfig.TIMEOUTS.STANDARD, // 60 seconds for Render cold starts
  headers: apiConfig.HEADERS,
});

/**
 * Request interceptor
 * Adds authorization headers and logs requests
 */
api.interceptors.request.use((config) => {
  if (apiConfig.FEATURES.LOG_REQUESTS) {
    apiLogger.log(`REQUEST: ${config.method?.toUpperCase()} ${config.url}`);
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Response interceptor
 * Logs responses and handles errors with friendly messages
 */
api.interceptors.response.use(
  (response) => {
    if (apiConfig.FEATURES.LOG_RESPONSES) {
      apiLogger.log(`RESPONSE: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Determine error type and provide helpful message
    if (error.code === 'ENOTFOUND') {
      error.message = '❌ Cannot reach backend. Check internet connection or backend URL in .env';
    } else if (error.code === 'ECONNREFUSED') {
      error.message = '❌ Backend server is not running. Start it with: npm run dev';
    } else if (error.code === 'ECONNABORTED') {
      error.message = '❌ Request timeout. Backend is taking too long. Check if Render is hibernated.';
    } else if (error.response?.status === 403) {
      error.message = '❌ CORS error. Backend may have wrong FRONTEND_URL configured.';
    } else if (error.response?.status === 404) {
      error.message = '❌ Endpoint not found. Check if backend route exists.';
    } else if (error.response?.status === 500) {
      error.message = '❌ Backend server error. Check backend logs.';
    }

    apiLogger.error(`ERROR: ${error.message}`, error.config?.url);
    return Promise.reject(error);
  }
);

/**
 * Product API endpoints
 */
export const productAPI = {
  create: (data) => api.post('/products', data),
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  addStock: (id, data) => api.post(`/products/${id}/stock/add`, data),
  reduceStock: (id, data) => api.post(`/products/${id}/stock/reduce`, data),
  getHistory: (id, params) => api.get(`/products/${id}/history`, { params }),
};

/**
 * Upload API endpoints
 */
export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: apiConfig.TIMEOUTS.UPLOAD, // 120 seconds for file upload
    });
  },
};

/**
 * Invoice API endpoints
 */
export const invoiceAPI = {
  create: (data) => api.post('/invoices', data),
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
};

/**
 * Customer API endpoints
 */
export const customerAPI = {
  create: (data) => api.post('/customers', data),
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

/**
 * Payment API endpoints
 */
export const paymentAPI = {
  create: (data) => api.post('/payments', data),
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
};

/**
 * Export API endpoints
 */
export const exportAPI = {
  getPdf: (params) => api.get('/exports/pdf', { params }),
  getExcel: (params) => api.get('/exports/excel', { params }),
};

export default api;
