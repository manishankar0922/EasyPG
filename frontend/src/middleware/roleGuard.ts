'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';

export function useRoleGuard(allowedRoles: ('admin' | 'owner' | 'warden' | 'staff')[]) {
  const { normalizedRole, role } = useUserRole();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!role) {
      // Wait for auth to hydrate. If it takes too long or they are logged out,
      // they should be caught by a generic auth guard, but let's handle it:
      const timer = setTimeout(() => {
        if (!role) {
          router.replace('/login');
        }
      }, 1000);
      return () => clearTimeout(timer);
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
