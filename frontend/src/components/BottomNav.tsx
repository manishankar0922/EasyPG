'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  IndianRupee,
  Bed,
  User,
  AlertCircle,
  BarChart3,
  MoreHorizontal,
  Building2,
  UserCheck,
  UserPlus,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * App navigation, designed for PG owners/wardens on smartphones:
 *  - Mobile: 5 fixed bottom tabs max (Home, Tenants, Payments, Rooms, More).
 *    Everything else lives in the "More" bottom sheet — large icon+label
 *    tiles, no jargon, one tap to any screen.
 *  - Desktop (md+): full grouped sidebar with every destination visible.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isAdmin, isOwner } = useUserRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Wait for client-side hydration before rendering.
  // Zustand `persist` reads from localStorage which doesn't exist on the server,
  // so `user` (and therefore `canManage`) differs between SSR and CSR passes.
  // Returning null until mounted guarantees both passes are identical.
  useEffect(() => { setMounted(true); }, []);

  const canManage = isAdmin || isOwner;

  // Active when exact or inside the section (/rooms/create → Rooms active)
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  // The 4 daily-use destinations — these earn a permanent tab
  const primaryItems = [
    { name: t.home, href: '/dashboard', icon: Home },
    { name: t.tenants, href: '/tenants', icon: Users },
    { name: t.payments, href: '/invoices', icon: IndianRupee },
    { name: t.rooms, href: '/rooms', icon: Bed },
  ];

  // Everything else goes in the "More" sheet (and the desktop sidebar)
  const moreItems = [
    { name: t.reports, href: '/reports', icon: BarChart3 },
    { name: t.complaints, href: '/complaints', icon: AlertCircle },
    { name: t.profile, href: '/profile', icon: User },
    ...(canManage
      ? [
          { name: t.branches, href: '/branches', icon: Building2 },
          { name: t.vacateHistory, href: '/vacate-history', icon: UserCheck },
          { name: t.staff, href: '/users', icon: UserPlus },
          { name: t.settings, href: '/settings', icon: Settings },
        ]
      : []),
  ];

  const moreIsActive = moreItems.some((item) => isActive(item.href));

  const tabClass = (active: boolean) =>
    cn(
      'flex flex-1 flex-col items-center justify-center h-full gap-1 transition-colors',
      active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
    );

  const sidebarLinkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 w-full h-11 px-4 rounded-xl text-sm font-semibold transition-colors',
      active
        ? 'bg-blue-50 text-blue-700'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    );

  if (!mounted) return null;

  return (
    <>
      {/* ── Mobile: bottom tab bar (≤5 items) ─────────────────────────── */}
      <nav
        aria-label="Main"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden"
      >
        <div className="flex items-stretch h-16 max-w-md mx-auto">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={tabClass(active)}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[11px] font-semibold leading-none">{item.name}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(tabClass(moreIsActive), 'cursor-pointer')}
          >
            <MoreHorizontal className="h-6 w-6" strokeWidth={moreIsActive ? 2.5 : 2} />
            <span className="text-[11px] font-semibold leading-none">{t.more}</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile: "More" bottom sheet ───────────────────────────────── */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl pb-safe w-full max-w-md mx-auto bg-white md:hidden"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-base font-semibold text-slate-900">
              {t.moreTitle}
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 pt-2 pb-4">
            {moreItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl border py-4 min-h-[72px] transition-colors',
                    active
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                  <span className="text-xs font-semibold text-center leading-tight">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Desktop: grouped sidebar ──────────────────────────────────── */}
      <aside
        aria-label="Main"
        className="hidden md:flex fixed top-0 left-0 z-50 h-screen w-64 flex-col bg-white border-r border-slate-200"
      >
        <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-lg font-black text-white">U9</span>
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">U9PGs</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {[
            ...primaryItems.slice(0, 1),
            { name: t.reports, href: '/reports', icon: BarChart3 },
            ...primaryItems.slice(1),
            { name: t.complaints, href: '/complaints', icon: AlertCircle },
          ].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={sidebarLinkClass(active)}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {item.name}
              </Link>
            );
          })}

          {canManage && (
            <div className="pt-4 mt-3 border-t border-slate-100 space-y-1">
              {[
                { name: t.branches, href: '/branches', icon: Building2 },
                { name: t.vacateHistory, href: '/vacate-history', icon: UserCheck },
                { name: t.staff, href: '/users', icon: UserPlus },
                { name: t.settings, href: '/settings', icon: Settings },
              ].map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={sidebarLinkClass(active)}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t border-slate-100">
          <Link
            href="/profile"
            aria-current={isActive('/profile') ? 'page' : undefined}
            className={sidebarLinkClass(isActive('/profile'))}
          >
            <User className="h-5 w-5" strokeWidth={isActive('/profile') ? 2.5 : 2} />
            {t.profile}
          </Link>
        </div>
      </aside>
    </>
  );
}
