'use client';

import { useAuthStore } from '@/store/auth-store';
import Sidebar from '@/components/Sidebar';
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
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-slate-900 capitalize tracking-tight">
              {pathname.split('/').pop()?.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center relative">
              <Search className="h-4 w-4 absolute left-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 w-64 transition-all"
              />
            </div>
            
            <button className="relative p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-px bg-slate-100 mx-2"></div>

            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Date</span>
              <span className="text-sm font-semibold text-slate-700">
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
