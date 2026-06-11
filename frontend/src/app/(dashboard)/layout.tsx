'use client';

import { useAuthStore } from '@/store/auth-store';
import BottomNav from '@/components/BottomNav';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Bell, Search } from 'lucide-react';

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
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-16">
      <main className="flex-1 w-full max-w-md mx-auto bg-white min-h-screen shadow-sm relative">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
