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
    // Intentionally no console.log — role/session info must not appear in browser console

    switch (role) {
      case 'superadmin':
      case 'super_admin':
      case 'admin':
        router.replace('/superadmin/dashboard');
        break;
      case 'owner':
      case 'warden':
      case 'staff':
        router.replace('/dashboard');
        break;
      default:
        // Unknown role — redirect to unauthorized without leaking role value
        router.replace('/unauthorized');
        break;
    }
  }, [user, router]);

  return <LoadingScreen message="Authenticating your account..." />;
}
