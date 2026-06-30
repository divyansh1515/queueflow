import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import { connectSocket } from './services/socket';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrderTrackingPage from './pages/customer/OrderTrackingPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMenu from './pages/admin/AdminMenu';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminOrders from './pages/admin/AdminOrders';
import AdminQR from './pages/admin/AdminQR';

// Auth Guard
const RequireAuth = ({ children, roles }) => {
  const { user, token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Redirect after login
function RoleRedirect() {
  const { user, token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === 'worker') {
    return <Navigate to="/worker" replace />;
  }

  return <Navigate to="/order/abc-juice" replace />;
}

export default function App() {
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
  }, [token]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            borderRadius: '12px',
            border: '1px solid #0f3460'
          }
        }}
      />

      <Routes>

        {/* PUBLIC */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* CUSTOMER - PUBLIC */}
        <Route
          path="/order/:shopId"
          element={<MenuPage />}
        />

        <Route
          path="/cart"
          element={<CartPage />}
        />

        <Route
          path="/track/:orderId"
          element={<OrderTrackingPage />}
        />

        {/* CUSTOMER - LOGIN REQUIRED */}
        <Route
          path="/orders"
          element={
            <RequireAuth roles={['customer']}>
              <OrderHistoryPage />
            </RequireAuth>
          }
        />

        {/* WORKER */}
        <Route
          path="/worker"
          element={
            <RequireAuth roles={['worker', 'admin']}>
              <WorkerDashboard />
            </RequireAuth>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/menu"
          element={
            <RequireAuth roles={['admin']}>
              <AdminMenu />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <RequireAuth roles={['admin']}>
              <AdminOrders />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <RequireAuth roles={['admin']}>
              <AdminAnalytics />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/qr"
          element={
            <RequireAuth roles={['admin']}>
              <AdminQR />
            </RequireAuth>
          }
        />

        {/* DEFAULT */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}