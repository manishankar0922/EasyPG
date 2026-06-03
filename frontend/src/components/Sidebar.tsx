'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Bed, 
  Users, 
  UserCheck, 
  FileText, 
  CreditCard, 
  Settings, 
  LogOut,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: UserPlus, label: 'Team', href: '/users' },
  { icon: Building2, label: 'Branches', href: '/branches' },
  { icon: Bed, label: 'Rooms', href: '/rooms' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: UserCheck, label: 'Admissions', href: '/admissions' },
  { icon: FileText, label: 'Invoices', href: '/invoices' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-white border-r border-slate-200">
      <div className="p-6">
        <h2 className="text-xl font-bold text-blue-600">U9 Solutions</h2>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center space-x-3 rounded-lg px-3 py-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-red-600 transition"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
