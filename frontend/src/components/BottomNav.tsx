'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, IndianRupee, Bed, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { name: t.home, href: '/dashboard', icon: Home },
    { name: t.tenants, href: '/tenants', icon: Users },
    { name: t.payments, href: '/invoices', icon: IndianRupee },
    { name: t.rooms, href: '/rooms', icon: Bed },
    { name: t.profile, href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/dashboard');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-[20%] h-full space-y-1 transition-colors",
                isActive ? "text-blue-600" : "text-slate-400"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
