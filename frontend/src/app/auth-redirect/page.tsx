'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function AuthRedirectPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {

    if (!user) {
      router.replace('/login');
      return;
    }

    const role = user.role?.toLowerCase() || '';
    console.log('[AuthRedirect] Evaluating role for redirect:', role);

    switch (role) {
      case 'superadmin':
      case 'super_admin':
      case 'admin':
        console.log('[AuthRedirect] Redirecting Super Admin to /superadmin/dashboard');
        router.replace('/superadmin/dashboard');
        break;
      case 'owner':
        console.log('[AuthRedirect] Redirecting Owner to /dashboard');
        router.replace('/dashboard');
        break;
      case 'warden':
        console.log('[AuthRedirect] Redirecting Warden to /dashboard');
        router.replace('/dashboard');
        break;
      default:
        console.warn('[AuthRedirect] Unknown role, redirecting to /unauthorized:', role);
        router.replace('/unauthorized');
        break;
    }
  }, [user, router]);

  return <LoadingScreen message="Authenticating your account..." />;
}
