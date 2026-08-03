'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Building2, Layers, Users, IndianRupee, Plus, ShieldAlert, LogOut, Clock, CheckCircle2, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import OrgTable from '@/components/superadmin/OrgTable';
import DevLoader from '@/components/superadmin/DevLoader';
import SuperadminAnalyticsCharts from '@/components/superadmin/SuperadminAnalyticsCharts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SuperAdminDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [subStats, setSubStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      const [dash, subs] = await Promise.allSettled([
        api.get('/superadmin/dashboard'),
        api.get('/superadmin/subscription-stats'),
      ]);
      if (dash.status === 'fulfilled' && dash.value.data?.success) {
        setData(dash.value.data.data);
      } else if (dash.status === 'rejected') {
        console.error('Failed to load superadmin dashboard', dash.reason);
      }
      if (subs.status === 'fulfilled' && subs.value.data?.success) {
        setSubStats(subs.value.data.data);
      }
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  if (!user || loading) {
    return <DevLoader message="Loading administrative view..." />;
  }

  const summary = data?.summary || {
    totalOrgs: 0,
    activeOrgs: 0,
    totalBranches: 0,
    totalTenants: 0,
    totalRevenue: 0
  };

  const organisations = data?.organisations || [];

  const subs = subStats || {
    pendingRequests: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    expiredUsers: 0,
    monthlyRevenue: 0,
  };
  const subTotal = Math.max(1, subs.activeSubscriptions + subs.trialUsers + subs.expiredUsers);
  const pct = (n: number) => `${((n / subTotal) * 100).toFixed(0)}%`;
  const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Top Bar */}
      <header className="bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="text-white font-bold text-sm sm:text-lg">EP</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-none">EasyPG Admin</h1>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Global Command Center</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-none">{user?.name || 'Developer'}</p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Super Admin</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center border-2 border-rose-500">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
          </div>
          <button 
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 hover:bg-rose-950/20 transition-all shrink-0 ml-1"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Orgs */}
          <div className="bg-slate-800/40 rounded-2xl p-5 shadow-sm border border-slate-700/60 hover:bg-slate-800/70 transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Organisations</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black text-white">{summary.totalOrgs}</h2>
                <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {summary.activeOrgs} active
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Branches */}
          <div className="bg-slate-800/40 rounded-2xl p-5 shadow-sm border border-slate-700/60 hover:bg-slate-800/70 transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Branches</p>
              <h2 className="text-3xl font-black text-white">{summary.totalBranches}</h2>
              <p className="text-xs text-slate-400 mt-1">Across all organisations</p>
            </div>
          </div>

          {/* Card 3: Total Tenants */}
          <div className="bg-slate-800/40 rounded-2xl p-5 shadow-sm border border-slate-700/60 hover:bg-slate-800/70 transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tenants</p>
              <h2 className="text-3xl font-black text-white">{summary.totalTenants}</h2>
              <p className="text-xs text-slate-400 mt-1">Active platform users</p>
            </div>
          </div>

          {/* Card 4: Total Revenue */}
          <div className="bg-slate-800/40 rounded-2xl p-5 shadow-sm border border-slate-700/60 hover:bg-slate-800/70 transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Revenue</p>
              <h2 className="text-3xl font-black text-white">₹{summary.totalRevenue.toLocaleString()}</h2>
              <p className="text-xs text-slate-400 mt-1">Processed this month</p>
            </div>
          </div>
        </div>

        {/* Analytics Charts Section */}
        <SuperadminAnalyticsCharts
          organisations={organisations}
          subStats={subs}
          monthlyRevenue={summary.totalRevenue}
          analytics={data?.analytics}
        />

        {/* SaaS Analytics: Subscription health + MRR + Pending approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Subscription Health (spans 2 cols on desktop) */}
          <div className="lg:col-span-2 bg-slate-800/40 rounded-2xl p-5 border border-slate-700/60">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Subscription Health</h3>
                <p className="text-xs text-slate-400 mt-0.5">{subTotal} total subscriptions</p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{inr(subs.monthlyRevenue)} MRR</span>
              </div>
            </div>

            {/* Segmented bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-700/40 mb-5">
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: pct(subs.activeSubscriptions) }} />
              <div className="bg-amber-500 transition-all duration-500" style={{ width: pct(subs.trialUsers) }} />
              <div className="bg-rose-500 transition-all duration-500" style={{ width: pct(subs.expiredUsers) }} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Active', value: subs.activeSubscriptions, color: 'text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
                { label: 'Trial', value: subs.trialUsers, color: 'text-amber-400', dot: 'bg-amber-500', icon: Clock },
                { label: 'Expired', value: subs.expiredUsers, color: 'text-rose-400', dot: 'bg-rose-500', icon: AlertTriangle },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-900/40 border border-slate-700/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approvals — actionable */}
          <Link
            href="/superadmin/subscriptions"
            className={`group rounded-2xl p-5 border transition-all flex flex-col justify-between ${
              subs.pendingRequests > 0
                ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                subs.pendingRequests > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/40 text-slate-400'
              }`}>
                <Clock className="h-6 w-6" />
              </div>
              {subs.pendingRequests > 0 && (
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">Pending Approvals</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black text-white">{subs.pendingRequests}</h2>
                <span className="text-xs font-semibold text-slate-400">payment requests</span>
              </div>
            </div>
            <div className={`mt-4 flex items-center gap-1.5 text-sm font-bold ${
              subs.pendingRequests > 0 ? 'text-amber-400' : 'text-slate-400'
            }`}>
              Review requests
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Action Bar & Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black text-white">Registered Organisations</h2>
            <div className="flex gap-3">
              <Link href="/superadmin/subscriptions" className="hidden sm:flex items-center gap-2 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                Subscriptions
              </Link>
              <Link href="/superadmin/organisations/new" className="hidden sm:flex items-center gap-2 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                <Plus className="h-4 w-4" />
                New Owner
              </Link>
              <Link href="/superadmin/organisations/new" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20">
                <Plus className="h-4 w-4" />
                New Organisation
              </Link>
            </div>
          </div>

          <OrgTable organisations={organisations} />
        </div>

      </main>

      {/* Floating Action Button (Mobile Only) */}
      <div className="fixed bottom-6 right-6 sm:hidden z-20">
        <Link href="/superadmin/organisations/new" className="flex items-center justify-center h-14 w-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform active:scale-95">
          <Plus className="h-6 w-6" />
        </Link>
      </div>

    </div>
  );
}
