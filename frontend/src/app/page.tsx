'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function RootPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [token, router, mounted]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}
