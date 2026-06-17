'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, IndianRupee, Bed, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { name: t.home, href: '/dashboard', icon: Home },
    { name: t.tenants, href: '/tenants', icon: Users },
    { name: t.payments, href: '/invoices', icon: IndianRupee },
    { name: t.rooms, href: '/rooms', icon: Bed },
    { name: t.profile, href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:top-0 md:w-64 md:h-screen md:border-t-0 md:border-r md:shadow-none">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto md:flex-col md:justify-start md:h-full md:max-w-none md:p-6 md:space-y-4">
        {/* Logo/Brand visible only on desktop */}
        <div className="hidden md:flex items-center gap-3 w-full mb-8 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-lg font-black text-white">U9</span>
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">U9PGs</span>
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/dashboard');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-[20%] h-full space-y-1 transition-colors md:flex-row md:justify-start md:w-full md:h-12 md:px-4 md:rounded-xl md:space-y-0 md:gap-3",
                isActive ? "text-blue-600 md:bg-blue-50" : "text-slate-400 md:text-slate-500 hover:text-slate-600 md:hover:bg-slate-50"
              )}
            >
              <Icon className="h-6 w-6 md:h-5 md:w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] md:text-sm font-bold tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
