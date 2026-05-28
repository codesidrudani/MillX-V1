import { create } from 'zustand';

export const useAuth = create((set) => ({
  user: null,
  token: localStorage.getItem('millx_token') || null,
  login: (user, token) => {
    localStorage.setItem('millx_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('millx_token');
    set({ user: null, token: null });
  },
  setUser: (user) => set({ user }),
}));
