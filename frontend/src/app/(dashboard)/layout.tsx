'use client';

import { useAuthStore } from '@/store/auth-store';
import BottomNav from '@/components/BottomNav';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { BranchProvider } from '@/context/BranchContext';
import { Loader2, Bell, Search } from 'lucide-react';

import OfflineIndicator from '@/components/shared/OfflineIndicator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !token && pathname !== '/login') {
      router.push('/login');
    }
  }, [isMounted, token, router, pathname]);

  if (!isMounted || (!token && pathname !== '/login')) {
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
