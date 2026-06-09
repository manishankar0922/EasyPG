'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Bed, 
  TrendingUp, 
  CreditCard, 
  Loader2, 
  ArrowUpRight,
  Building2,
  Calendar,
  Activity,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Overview {
  total_rooms: number;
  total_capacity: number;
  occupied_capacity: number;
  vacant_capacity: number;
  occupancy_percentage: string;
  total_tenants: number;
  total_invoiced: number;
  total_collected: number;
  total_pending: number;
}

interface OccupancyData {
  branchName: string;
  total: number;
  occupied: number;
  percentage: string;
}

interface PendingPayment {
  id: string;
  tenantName: string;
  amount: string;
  paid: number;
  pending: number;
  dueDate: string;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyData[]>([]);
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [overviewRes, occupancyRes, pendingRes] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/occupancy'),
          api.get('/dashboard/pending-payments')
        ]);
        setOverview(overviewRes.data.data);
        setOccupancy(occupancyRes.data.data);
        setPending(pendingRes.data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Active Tenants', 
      value: overview?.total_tenants || 0, 
      icon: Users, 
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: '+12% this month'
    },
    { 
      label: 'Occupancy Rate', 
      value: `${overview?.occupancy_percentage}%`, 
      icon: Activity, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: 'Optimal range'
    },
    { 
      label: 'Revenue (MTD)', 
      value: `₹${overview?.total_collected.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      trend: 'On track'
    },
    { 
      label: 'Outstanding', 
      value: `₹${overview?.total_pending.toLocaleString()}`, 
      icon: CreditCard, 
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      trend: 'Requires action'
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Command Center</h1>
          <p className="text-slate-500 mt-1 font-medium text-lg">Your hostel empire at a glance.</p>
        </div>
        <button className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-semibold shadow-lg shadow-slate-200">
          <span>Generate Report</span>
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="group relative overflow-hidden rounded-3xl border border-white bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
              <div className={cn("rounded-2xl p-3 shadow-inner", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 text-slate-400 uppercase tracking-widest">Live</div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              <div className="mt-4 flex items-center text-xs font-semibold text-slate-500">
                <span className={cn("mr-2 px-1.5 py-0.5 rounded-md", stat.bg, stat.color)}>{stat.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        {/* Branch-wise Occupancy */}
        <div className="lg:col-span-3 rounded-3xl border border-white bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Branch Performance</h3>
              <p className="text-sm text-slate-400 font-medium mt-0.5">Occupancy metrics per location</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-8">
            {occupancy.map((branch) => (
              <div key={branch.branchName} className="group">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-bold text-slate-700 text-base">{branch.branchName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 font-medium">{branch.occupied} / {branch.total} Beds</span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tighter",
                      Number(branch.percentage) > 90 ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {branch.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-50 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.2)]",
                      Number(branch.percentage) > 90 ? "bg-rose-500" : "bg-blue-600"
                    )}
                    style={{ width: `${branch.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="lg:col-span-2 rounded-3xl border border-white bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Critical Dues</h3>
              <p className="text-sm text-slate-400 font-medium mt-0.5">Action required immediately</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-5">
            {pending.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <p className="text-slate-500 font-bold">Zero pending dues!</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Excellent Operations</p>
              </div>
            ) : (
              pending.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 tracking-tight">{p.tenantName}</p>
                      <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        <Calendar className="mr-1 h-3 w-3" />
                        Due {new Date(p.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-rose-600 tracking-tighter">₹{p.pending.toLocaleString()}</p>
                    <ArrowRight className="h-3 w-3 text-slate-300 ml-auto mt-1" />
                  </div>
                </div>
              ))
            )}
            {pending.length > 5 && (
              <button className="w-full py-3 text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">
                View all {pending.length} pending
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
