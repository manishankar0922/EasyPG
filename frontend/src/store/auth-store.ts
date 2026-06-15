import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'SUPERADMIN' | 'OWNER' | 'WARDEN' | 'STAFF';
  organizationId: string | null;
  branchId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  avatar?: string;
  branchName?: string;
  phone?: string;
  email?: string;
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
        if (typeof document !== 'undefined') {
          document.cookie = `easypg_token=${token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `easypg_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
        }
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('u9-auth-token');
        if (typeof document !== 'undefined') {
          document.cookie = 'easypg_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'easypg_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({ user: null, token: null });
      },
    }),
    {
      name: 'u9-auth-storage',
    }
  )
);
