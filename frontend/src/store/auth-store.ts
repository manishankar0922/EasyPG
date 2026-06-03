import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  role: 'OWNER' | 'WARDEN';
  organizationId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('u9-auth-token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('u9-auth-token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'u9-auth-storage',
    }
  )
);
