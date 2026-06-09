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
  UserPlus,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

const mainMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Branches', href: '/branches' },
  { icon: Bed, label: 'Rooms', href: '/rooms' },
];

const managementItems = [
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: UserCheck, label: 'Admissions', href: '/admissions' },
  { icon: UserPlus, label: 'Staff Management', href: '/users' },
];

const financialItems = [
  { icon: FileText, label: 'Invoices', href: '/invoices' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
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

  const NavItem = ({ item }: { item: any }) => {
    const isActive = pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <div className="flex items-center space-x-3">
          <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-blue-600")} />
          <span>{item.label}</span>
        </div>
        {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen w-72 flex-col bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="px-8 py-8">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Hostel<span className="text-blue-600">Pro</span></h2>
        </div>
      </div>

      <nav className="flex-1 space-y-8 px-4 overflow-y-auto custom-scrollbar">
        <div>
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Core Overview</p>
          <div className="space-y-1">
            {mainMenuItems.map((item) => <NavItem key={item.href} item={item} />)}
          </div>
        </div>

        <div>
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Operations</p>
          <div className="space-y-1">
            {managementItems.map((item) => <NavItem key={item.href} item={item} />)}
          </div>
        </div>

        <div>
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Financials</p>
          <div className="space-y-1">
            {financialItems.map((item) => <NavItem key={item.href} item={item} />)}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-50 bg-slate-50/50">
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Logout"
            className="group rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
