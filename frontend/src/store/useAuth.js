import { create } from 'zustand';

export const useAuth = create((set) => ({
  user: JSON.parse(localStorage.getItem('millx_user') || 'null'),
  token: localStorage.getItem('millx_token') || null,
  login: (user, token) => {
    localStorage.setItem('millx_token', token);
    localStorage.setItem('millx_user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('millx_token');
    localStorage.removeItem('millx_user');
    set({ user: null, token: null });
  },
  setUser: (user) => {
    localStorage.setItem('millx_user', JSON.stringify(user));
    set({ user });
  },
}));
