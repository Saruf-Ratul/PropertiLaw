import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  userType: 'firm' | 'client';
  lawFirmId?: string;
  clientId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load token from localStorage on init
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return {
    user: null,
    token,
    login: async (email: string, password: string) => {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      set({ user, token });
    },
    logout: () => {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      set({ user: null, token: null });
    },
    loadUser: async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        set({ user: response.data.user });
      } catch (error) {
        // Token invalid, clear auth
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
      }
    }
  };
});

