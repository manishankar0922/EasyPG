'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuthStore } from '@/store/auth-store';

export function useRoleGuard(allowedRoles: ('admin' | 'owner' | 'warden' | 'staff')[]) {
  const { normalizedRole, role } = useUserRole();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!role) {
      // If no role in Zustand, we might be out of sync with HttpOnly cookie.
      // Attempt to restore session before forcefully redirecting.
      import('@/lib/api').then(({ default: api }) => {
        api.get('/auth/me')
          .then(res => {
            if (res.data.success && res.data.data) {
              useAuthStore.getState().setAuth(res.data.data, 'restored-from-cookie');
            } else {
              router.replace('/login');
            }
          })
          .catch(() => {
            router.replace('/login');
          });
      });
      return;
    }

    if (!allowedRoles.includes(normalizedRole as any)) {
      // Blocked
      router.replace(normalizedRole === 'admin' ? '/admin' : '/dashboard');
    } else {
      // Allowed
      setIsAuthorized(true);
      setIsChecking(false);
    }
  }, [role, normalizedRole, allowedRoles, router]);

  return { isAuthorized, isChecking };
}
