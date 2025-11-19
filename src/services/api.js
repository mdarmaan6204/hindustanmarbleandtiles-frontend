import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ENOTFOUND') {
      error.message = 'MongoDB connection failed. Check your internet connection.';
    } else if (error.code === 'ECONNREFUSED') {
      error.message = 'Backend server is not running. Check port 5000.';
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Server is taking too long to respond.';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  me: () => api.get('/auth/me'),
};

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

export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60 seconds for file upload
    });
  },
};

export default api;
