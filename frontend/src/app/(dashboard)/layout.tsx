'use client';

import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import BottomNav from '@/components/BottomNav';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { BranchProvider } from '@/context/BranchContext';
import { Loader2 } from 'lucide-react';
import OfflineIndicator from '@/components/shared/OfflineIndicator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user, setAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const sessionRestored = useRef(false);

  // Fast-path: check localStorage synchronously before Zustand hydrates.
  // This prevents the "needs refresh" issue — on first render after login,
  // Zustand persist middleware may not have rehydrated yet, but localStorage IS ready.
  const hasLocalToken =
    typeof window !== 'undefined'
      ? !!(localStorage.getItem('u9pgs_token') || localStorage.getItem('u9-auth-token'))
      : false;

  const isAuthenticated = !!(token || hasLocalToken);

  useEffect(() => {
    // If Zustand is empty but localStorage has a token, restore the session once.
    // This handles hard refresh after login.
    if (!token && hasLocalToken && !sessionRestored.current) {
      sessionRestored.current = true;
      api.get('/auth/me')
        .then(res => {
          if (res.data.success && res.data.data) {
            const localToken =
              localStorage.getItem('u9pgs_token') ||
              localStorage.getItem('u9-auth-token') ||
              'restored';
            setAuth(res.data.data, localToken);
          } else {
            router.replace('/login');
          }
        })
        .catch(() => {
          router.replace('/login');
        });
    } else if (!token && !hasLocalToken && pathname !== '/login') {
      router.replace('/login');
    }
  }, [token, hasLocalToken, pathname, router, setAuth]);

  // Only show spinner if we have no token AND no local token — truly unauthenticated
  if (!isAuthenticated && pathname !== '/login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <LanguageProvider>
      <BranchProvider>
        <OfflineIndicator />
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans pb-16 md:pb-0">
          <BottomNav />
          <main className="flex-1 w-full max-w-md md:max-w-6xl mx-auto bg-white min-h-screen shadow-sm relative md:ml-64 md:border-l md:border-r md:border-slate-100">
            {children}
          </main>
        </div>
      </BranchProvider>
    </LanguageProvider>
  );
}
