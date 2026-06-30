import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.login({ email, password });
          localStorage.setItem('queueflow_token', data.token);
          connectSocket(data.token);
          set({ user: data.data, token: data.token, isLoading: false });
          return data.data;
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      register: async (formData) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.register(formData);
          localStorage.setItem('queueflow_token', data.token);
          connectSocket(data.token);
          set({ user: data.data, token: data.token, isLoading: false });
          return data.data;
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      logout: () => {
        localStorage.removeItem('queueflow_token');
        localStorage.removeItem('queueflow_user');
        disconnectSocket();
        set({ user: null, token: null });
      },

      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'admin',
      isWorker: () => ['worker', 'admin'].includes(get().user?.role),
      isCustomer: () => get().user?.role === 'customer'
    }),
    { name: 'queueflow_auth', partialize: (state) => ({ user: state.user, token: state.token }) }
  )
);

export default useAuthStore;
