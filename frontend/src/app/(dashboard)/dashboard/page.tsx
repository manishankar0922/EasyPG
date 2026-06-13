'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import BranchSwitcher from '@/components/shared/BranchSwitcher';
import { Bed, Users, IndianRupee, MessageCircle, Wallet } from 'lucide-react';
import Image from 'next/image';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function MobileDashboard() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const { activeBranchId, loading: branchLoading } = useBranch();
  const [data, setData] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!activeBranchId) return;
      try {
        setLoading(true);
        const [dashboardRes, vacanciesRes] = await Promise.all([
          api.get(`/dashboard/mobile-home?branchId=${activeBranchId}`),
          api.get(`/branches/${activeBranchId}/upcoming-vacancies`)
        ]);
        
        if (dashboardRes.data.success) {
          setData(dashboardRes.data.data);
        }
        if (vacanciesRes.data.success) {
          setVacancies(vacanciesRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeBranchId]);

  if (branchLoading || (loading && activeBranchId)) {
    return <LoadingScreen message="Loading your dashboard..." />;
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
      <div className="bg-white px-5 py-4 shadow-sm sticky top-0 z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">EasyPG</h1>
            <p className="text-sm font-semibold text-slate-500">{user?.name || 'Owner'}</p>
          </div>
          <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-500 overflow-hidden shrink-0">
            <span className="text-blue-700 font-bold text-lg">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U9'}
            </span>
          </div>
        </div>
        <BranchSwitcher />
      </div>

      <div className="p-4 space-y-4">
        {/* 4 Summary Cards (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Upcoming Vacancies List */}
        {vacancies.length > 0 && (
          <div className="mt-8">
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
                        onClick={() => window.location.href = `/tenants/new?roomId=${admission?.room?.id}`}
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
        <div className="mt-8">
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
            {d.pendingTenants.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button className="text-sm font-bold text-blue-600 active:text-blue-800">
                  View All Pending
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
