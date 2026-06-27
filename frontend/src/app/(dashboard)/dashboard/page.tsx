'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import BranchSwitcher from '@/components/shared/BranchSwitcher';
import { Bed, Users, IndianRupee, MessageCircle, Wallet } from 'lucide-react';
import Image from 'next/image';
import LoadingScreen from '@/components/shared/LoadingScreen';
import TenantDashboard from '@/components/tenant/TenantDashboard';

export default function MobileDashboard() {
  const { user } = useAuthStore();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { activeBranchId, loading: branchLoading, error: branchError } = useBranch();
  const [data, setData] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!activeBranchId || user?.role === 'TENANT') return;
      try {
        setLoading(true);
        setDashboardError(null);

        // Run both API calls in parallel
        const [dashboardResult, vacanciesResult] = await Promise.allSettled([
          api.get(`/dashboard/mobile-home?branchId=${activeBranchId}`),
          api.get(`/branches/${activeBranchId}/upcoming-vacancies`)
        ]);

        if (dashboardResult.status === 'fulfilled' && dashboardResult.value.data?.success) {
          setData(dashboardResult.value.data.data);
        } else if (dashboardResult.status === 'rejected') {
          const err = dashboardResult.reason;
          setDashboardError(err.message || 'Failed to load dashboard stats.');
        }

        if (vacanciesResult.status === 'fulfilled' && vacanciesResult.value.data?.success) {
          setVacancies(vacanciesResult.value.data.data);
        }

      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeBranchId]);

  if (branchLoading || (loading && activeBranchId && !data && !dashboardError && user?.role !== 'TENANT')) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (user?.role === 'TENANT') {
    return <TenantDashboard />;
  }

  if (branchError || dashboardError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Connection Error</h2>
        <p className="text-slate-500 font-medium">
          {branchError || dashboardError}
        </p>
        <button 
          onClick={() => router.refresh()} 
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Fallback defaults if data is missing
  const d = data || {
    rentPending: { amount: 0, tenantCount: 0, status: 'PAID' },
    collectedThisMonth: { amount: 0, tenantCount: 0 },
    emptyBeds: { count: 0, roomCount: 0 },
    totalTenants: { count: 0, checkedInThisMonth: 0 },
    pendingTenants: []
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white px-5 py-4 shadow-sm sticky top-0 z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
        <div className="flex items-center justify-between flex-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">U9PGs</h1>
            <p className="text-sm font-semibold text-slate-500">{user?.name || 'Owner'}</p>
          </div>
          <div className="flex flex-col items-end justify-center text-right bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100 md:hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
              {new Date().toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-US', { weekday: 'short' })}
            </p>
            <p className="text-lg font-black text-blue-600 leading-none">
              {new Date().toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-US', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <BranchSwitcher />
          <div className="hidden md:flex flex-col items-end justify-center text-right bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
              {new Date().toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-US', { weekday: 'long' })}
            </p>
            <p className="text-lg font-black text-blue-600 leading-none">
              {new Date().toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-4 md:space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {/* Card 1: Rent Pending */}
          <div className={`bg-white rounded-2xl p-4 shadow-sm border flex flex-col justify-center min-h-[100px] active:scale-95 transition-transform ${
            d.rentPending.status === 'OVERDUE' ? 'border-rose-200' : 
            d.rentPending.status === 'PENDING' ? 'border-amber-200' : 
            'border-emerald-200'
          }`}>
            <div className={`flex items-center gap-1.5 mb-1 ${
              d.rentPending.status === 'OVERDUE' ? 'text-rose-500' : 
              d.rentPending.status === 'PENDING' ? 'text-amber-500' : 
              'text-emerald-500'
            }`}>
              <IndianRupee className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{t.pendingRent}</span>
            </div>
            <div className={`text-3xl font-black mb-1 ${
              d.rentPending.status === 'OVERDUE' ? 'text-rose-600' : 
              d.rentPending.status === 'PENDING' ? 'text-amber-600' : 
              'text-emerald-600'
            }`}>
              ₹{d.rentPending.amount.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-slate-500">
              {d.rentPending.tenantCount} {t.tenantsNotPaid}
            </div>
          </div>

          {/* Card 2: Collected */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[100px] active:scale-95 transition-transform">
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{t.collectedThisMonth}</span>
            </div>
            <div className="text-3xl font-black text-emerald-600 mb-1">
              ₹{d.collectedThisMonth.amount.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-slate-500">
              {d.collectedThisMonth.tenantCount} {t.tenantsPaid}
            </div>
          </div>

          {/* Card 3: Empty Beds */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[100px] active:scale-95 transition-transform">
            <div className="flex items-center gap-1.5 text-amber-500 mb-1">
              <Bed className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{t.emptyBeds}</span>
            </div>
            <div className="text-3xl font-black text-amber-500 mb-1">
              {d.emptyBeds.count}
            </div>
            <div className="text-xs font-medium text-slate-500">
              {d.emptyBeds.roomCount} {t.roomsHaveVacancy}
            </div>
          </div>

          {/* Card 4: Total Tenants */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[100px] active:scale-95 transition-transform">
            <div className="flex items-center gap-1.5 text-blue-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{t.totalTenants}</span>
            </div>
            <div className="text-3xl font-black text-blue-600 mb-1">
              {d.totalTenants.count}
            </div>
            <div className="text-xs font-medium text-slate-500">
              {d.totalTenants.checkedInThisMonth} {t.checkedInThisMonth}
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${vacancies.length > 0 ? 'lg:grid-cols-2' : ''} gap-8 items-start mt-8`}>
          {/* Upcoming Vacancies List */}
          {vacancies.length > 0 && (
            <div className="w-full">
              <h2 className="text-lg font-black text-slate-900 mb-4 px-1">🚪 Upcoming Vacancies</h2>
              
              <div className="bg-white rounded-3xl shadow-sm border border-orange-200 overflow-hidden">
                <div className="divide-y divide-orange-100">
                  {vacancies.map((notice: any) => {
                    const admission = notice.tenant?.admissions?.[0];
                    const roomNumber = admission?.room?.roomNumber || 'N/A';
                    const bedName = admission?.bed?.bedNumber || 'N/A';
                    const vacateDate = new Date(notice.vacateDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                    return (
                      <div key={notice.id} className="p-4 flex flex-col gap-3 min-h-[72px] bg-orange-50/30">
                        <div>
                          <p className="font-bold text-slate-900 leading-tight text-base mb-0.5">
                            Room {roomNumber} · {bedName}
                          </p>
                          <p className="text-sm font-semibold text-orange-600 leading-none">
                            {notice.tenant?.name} leaving on {vacateDate}
                          </p>
                        </div>
                        
                        <button 
                          onClick={() => router.push(`/tenants/new?roomId=${admission?.room?.id}`)}
                          className="w-full bg-white border border-orange-200 text-orange-600 font-bold text-sm py-2 rounded-xl active:bg-orange-100 transition-colors"
                        >
                          Find New Tenant
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pending Rent List */}
          <div className="w-full">
            <h2 className="text-lg font-black text-slate-900 mb-4 px-1">{t.pendingRent}</h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {d.pendingTenants.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">
                {t.noTenantsFound}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {d.pendingTenants.map((t: any) => (
                  <div key={t.id} className="p-4 flex items-center justify-between min-h-[72px]">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden relative">
                        {t.photoUrl ? (
                          <Image src={t.photoUrl} alt={t.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400 font-bold">
                            {t.name.substring(0, 1)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight text-base mb-0.5">{t.name}</p>
                        <p className="text-sm font-semibold text-slate-500 leading-none">Room {t.roomNumber}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-black text-rose-600 text-lg leading-tight">₹{t.rentPending}</p>
                      </div>
                      <a 
                        href={`https://wa.me/91${t.phone}?text=${encodeURIComponent(`Hello ${t.name}, your rent of ₹${t.rentPending} is pending. Please pay soon.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center active:bg-[#25D366]/20 transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
