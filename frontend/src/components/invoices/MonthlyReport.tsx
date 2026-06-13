'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useBranch } from '@/context/BranchContext';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function MonthlyReport() {
  const { user } = useAuthStore();
  const { activeBranchId } = useBranch();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Month selection
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchReport = async () => {
    if (!activeBranchId) return;
    try {
      setLoading(true);
      const branchIdToFetch = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN' ? 'all' : activeBranchId;
      
      const res = await api.get(`/branches/${branchIdToFetch}/monthly-report`, {
        params: {
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch monthly report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeBranchId, currentDate, user]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  if (loading && !data) return <LoadingScreen message="Loading report..." />;

  const d = data || {
    expectedRent: 0,
    collectedRent: 0,
    pendingRent: 0,
    collectionRate: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    occupancyRate: 0,
    vsLastMonth: { rentDiff: 0, occupancyDiff: 0 },
    branches: []
  };

  const getRateColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-500';
    if (rate >= 70) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const getRateTextColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-500';
    if (rate >= 70) return 'text-orange-500';
    return 'text-rose-500';
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 flex-1 overflow-y-auto space-y-6 pb-20 animate-in fade-in">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
        <button 
          onClick={() => changeMonth(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-500 active:scale-95 transition-transform"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="font-black text-slate-800 text-lg">{monthName}</div>
        <button 
          onClick={() => changeMonth(1)}
          disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
          className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-500 active:scale-95 transition-transform disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="space-y-3">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-300" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">💰 Expected This Month</p>
          <p className="text-4xl font-black text-slate-900 mb-1">₹{d.expectedRent.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-400">Total potential revenue from active tenants</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">✅ Collected</p>
            <p className="text-2xl font-black text-emerald-700">₹{d.collectedRent.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50 rounded-3xl p-5 border border-rose-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">❌ Pending</p>
            <p className="text-2xl font-black text-rose-700">₹{d.pendingRent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Collection Rate */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-end mb-3">
          <p className="font-bold text-slate-700">Collection Rate</p>
          <p className={cn("text-2xl font-black", getRateTextColor(d.collectionRate))}>
            {d.collectionRate}%
          </p>
        </div>
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-1000", getRateColor(d.collectionRate))} 
            style={{ width: `${d.collectionRate}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-slate-500 text-center mt-3">
          Collected {d.collectionRate}% of expected rent
        </p>
      </div>

      {/* Occupancy */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-900 mb-4">🛏️ Occupancy This Month</h2>
        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-slate-800">{d.totalBeds}</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div className="text-center">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Occupied</p>
            <p className="text-2xl font-black text-emerald-700">{d.occupiedBeds}</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div className="text-center">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Vacant</p>
            <p className="text-2xl font-black text-amber-600">{d.totalBeds - d.occupiedBeds}</p>
          </div>
        </div>
        <div className="h-3 w-full bg-amber-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${d.occupancyRate}%` }} />
        </div>
        <p className="text-xs font-semibold text-slate-500 text-center mt-2">
          {d.occupancyRate}% occupancy rate
        </p>
      </div>

      {/* Month Over Month */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Compared to Last Month</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", d.vsLastMonth.rentDiff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {d.vsLastMonth.rentDiff >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-bold text-slate-900">
                {d.vsLastMonth.rentDiff >= 0 ? '↑' : '↓'} ₹{Math.abs(d.vsLastMonth.rentDiff).toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {d.vsLastMonth.rentDiff >= 0 ? 'more collected' : 'less collected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", d.vsLastMonth.occupancyDiff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {d.vsLastMonth.occupancyDiff >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-bold text-slate-900">
                {d.vsLastMonth.occupancyDiff >= 0 ? '↑' : '↓'} {Math.abs(d.vsLastMonth.occupancyDiff)} beds
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {d.vsLastMonth.occupancyDiff >= 0 ? 'more occupied' : 'less occupied'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Comparison */}
      {(user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN') && d.branches?.length > 1 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            <h2 className="font-black text-slate-900">Branch Performance</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-4 px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-1">Branch</div>
              <div className="text-right">Expected</div>
              <div className="text-right">Collected</div>
              <div className="text-right">Occ %</div>
            </div>
            {d.branches.map((b: any) => (
              <div 
                key={b.id} 
                className={cn(
                  "grid grid-cols-4 px-4 py-3 text-sm items-center",
                  b.occupancyRate < 70 ? "bg-rose-50/50" : ""
                )}
              >
                <div className="col-span-1 font-bold text-slate-900 truncate pr-2">{b.name}</div>
                <div className="text-right font-semibold text-slate-600">₹{(b.expectedRent/1000).toFixed(1)}k</div>
                <div className="text-right font-black text-emerald-600">₹{(b.collectedRent/1000).toFixed(1)}k</div>
                <div className="text-right flex items-center justify-end gap-1">
                  <span className="font-bold text-slate-700">{b.occupancyRate}%</span>
                  <div className={cn("h-2 w-2 rounded-full", getRateColor(b.occupancyRate))} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
