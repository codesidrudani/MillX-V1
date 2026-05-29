import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('millx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.error === 'PAYMENT_PENDING') {
      localStorage.removeItem('millx_token');
      localStorage.removeItem('millx_user');
      window.location.href = '/login?frozen=true';
    }
    return Promise.reject(error);
  }
);

export default api;
