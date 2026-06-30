import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('queueflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('queueflow_token');
      localStorage.removeItem('queueflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateFcmToken: (fcmToken) => api.patch('/auth/update-fcm-token', { fcmToken }),
  createStaff: (data) => api.post('/auth/create-staff', data)
};

// ─── Menu ──────────────────────────────────────────────────────────────────
export const menuAPI = {
  getAll: (params) => api.get('/menu', { params }),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  delete: (id) => api.delete(`/menu/${id}`),
  toggle: (id) => api.patch(`/menu/${id}/toggle`)
};

// ─── Orders ───────────────────────────────────────────────────────────────
export const orderAPI = {
  getQueue: () => api.get('/orders/queue'),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  getHistory: (params) => api.get('/orders/history', { params }),

  verifyPickupPin: (id, pickupPin) =>
    api.post(`/orders/${id}/verify-pin`, {
      pickupPin
    })
};
// ─── Payment ──────────────────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (items) => api.post('/payment/create-order', { items }),
  verify: (data) => api.post('/payment/verify', data),
  refund: (orderId) => api.post('/payment/refund', { orderId })
};

// ─── Analytics ────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getWeekly: () => api.get('/analytics/weekly'),
  getPeakHours: () => api.get('/analytics/peak-hours'),
  getInventoryForecast: () => api.get('/analytics/inventory-forecast')
};

// ─── QR ───────────────────────────────────────────────────────────────────
export const qrAPI = {
  generate: () => api.get('/qr/generate'),
  download: () => api.get('/qr/download', { responseType: 'blob' })
};

export default api;
