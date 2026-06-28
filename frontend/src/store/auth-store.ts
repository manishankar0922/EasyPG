import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'SUPERADMIN' | 'OWNER' | 'WARDEN' | 'STAFF' | 'TENANT';
  organizationId: string | null;
  organisationId?: string | null;
  branchId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  avatar?: string;
  branchName?: string;
  organisationName?: string;
  phone?: string;
  email?: string;
  plan?: string;
  subscriptionStatus?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

/**
 * Sanitize user-facing strings to prevent XSS.
 * Strips script tags and dangerous HTML characters from user-supplied values.
 */
const sanitizeString = (value: string): string =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();

const sanitizeUser = (user: User): User => ({
  ...user,
  name: sanitizeString(user.name || ''),
  branchName: user.branchName ? sanitizeString(user.branchName) : undefined,
});

/**
 * Sets the session cookie via a server-side Next.js API route so that
 * the cookie can be marked HttpOnly (inaccessible to JavaScript/XSS).
 */
export const setServerSideCookies = async (token: string, role: string) => {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, role }),
      credentials: 'same-origin',
    });
  } catch {
    // Non-critical: middleware will still read from localStorage via Authorization header
  }
};

const clearServerSideCookies = async () => {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/auth/clear-session', {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch {
    // Non-critical
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        const safeUser = sanitizeUser(user);
        // Store token in localStorage for Authorization header use
        localStorage.setItem('u9-auth-token', token);
        // Set HttpOnly cookies via server route (XSS-safe)
        setServerSideCookies(token, safeUser.role);
        set({ user: safeUser, token });
      },
      logout: () => {
        localStorage.removeItem('u9-auth-token');
        localStorage.removeItem('u9pgs_token');
        clearServerSideCookies();
        set({ user: null, token: null });
      },
    }),
    {
      name: 'u9-auth-storage',
    }
  )
);
