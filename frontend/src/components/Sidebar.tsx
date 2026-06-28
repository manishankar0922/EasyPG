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
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useUserRole } from '@/hooks/useUserRole';

const mainMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Branches', href: '/branches', adminOnly: true },
  { icon: Bed, label: 'Rooms', href: '/rooms' }, // Client gets view only, handled in the page
];

const managementItems = [
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: UserCheck, label: 'Admissions', href: '/admissions', adminOnly: true },
  { icon: UserPlus, label: 'Staff Management', href: '/users', adminOnly: true },
];

const financialItems = [
  { icon: FileText, label: 'Invoices', href: '/invoices', adminOnly: true },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
];

const adminSettingsItem = { icon: ShieldCheck, label: 'Super Admin', href: '/superadmin/dashboard', adminOnly: true };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { isAdmin } = useUserRole();

  const handleLogout = async () => {
    await logout();
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

  const filterItems = (items: any[]) => items.filter(item => isAdmin || !item.adminOnly);

  const visibleMain = filterItems(mainMenuItems);
  const visibleMgmt = filterItems(managementItems);
  const visibleFin = filterItems(financialItems);

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
        {visibleMain.length > 0 && (
          <div>
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Core Overview</p>
            <div className="space-y-1">
              {visibleMain.map((item) => <NavItem key={item.href} item={item} />)}
            </div>
          </div>
        )}

        {visibleMgmt.length > 0 && (
          <div>
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Operations</p>
            <div className="space-y-1">
              {visibleMgmt.map((item) => <NavItem key={item.href} item={item} />)}
            </div>
          </div>
        )}

        {visibleFin.length > 0 && (
          <div>
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Financials</p>
            <div className="space-y-1">
              {visibleFin.map((item) => <NavItem key={item.href} item={item} />)}
            </div>
          </div>
        )}

        {isAdmin && (
          <div>
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">System</p>
            <div className="space-y-1">
              <NavItem item={adminSettingsItem} />
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-50 bg-slate-50/50">
        
        {/* Subscription Plan Badge */}
        {user?.role !== 'TENANT' && user?.role !== 'SUPERADMIN' && user?.role !== 'SUPER_ADMIN' && (
          <div className="mb-4 px-1">
            <div className={cn(
              "rounded-2xl p-4 flex flex-col justify-center items-start border relative overflow-hidden transition-all hover:scale-[1.02]",
              user?.plan === 'ENTERPRISE' 
                ? "bg-gradient-to-br from-indigo-900 to-violet-900 border-indigo-500/30 text-white shadow-lg shadow-indigo-900/20"
                : user?.plan === 'PRO' || user?.subscriptionStatus === 'TRIAL'
                  ? "bg-gradient-to-br from-slate-900 to-black border-slate-700 text-white shadow-xl shadow-black/10"
                  : "bg-white border-slate-200 text-slate-800 shadow-sm"
            )}>
              {/* Decorative background shape */}
              {(user?.plan === 'PRO' || user?.plan === 'ENTERPRISE' || user?.subscriptionStatus === 'TRIAL') && (
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 blur-2xl rounded-full pointer-events-none"></div>
              )}
              
              <div className="flex items-center gap-2 mb-1 z-10">
                <ShieldCheck className={cn(
                  "h-4 w-4",
                  user?.plan === 'ENTERPRISE' ? "text-indigo-400" :
                  user?.plan === 'PRO' || user?.subscriptionStatus === 'TRIAL' ? "text-yellow-400" : "text-blue-600"
                )} />
                <span className="text-[11px] font-black uppercase tracking-widest opacity-80">
                  {user?.subscriptionStatus === 'TRIAL' ? '14-Day Free Trial' : 'Current Plan'}
                </span>
              </div>
              
              <div className="flex items-end justify-between w-full z-10">
                <span className="font-extrabold text-lg leading-none">
                  {user?.plan === 'ENTERPRISE' ? 'Enterprise' : 
                   user?.plan === 'PRO' || user?.subscriptionStatus === 'TRIAL' ? 'Pro Plan' : 'Basic Plan'}
                </span>
                
                {user?.plan === 'BASIC' && user?.subscriptionStatus !== 'TRIAL' && (
                  <Link href="/settings" className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                    Upgrade
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-600 border border-slate-200">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Logout"
            className="group rounded-xl p-2.5 text-slate-400 bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
