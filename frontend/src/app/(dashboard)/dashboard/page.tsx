'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Bed, 
  TrendingUp, 
  CreditCard, 
  Loader2, 
  ArrowDownRight,
  Building2,
  Calendar
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
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    { 
      label: 'Total Tenants', 
      value: overview?.total_tenants || 0, 
      icon: Users, 
      color: 'bg-blue-50 text-blue-600',
      description: 'Active residents'
    },
    { 
      label: 'Occupancy', 
      value: `${overview?.occupancy_percentage}%`, 
      icon: Bed, 
      color: 'bg-purple-50 text-purple-600',
      description: `${overview?.occupied_capacity}/${overview?.total_capacity} beds occupied`
    },
    { 
      label: 'Total Collected', 
      value: `₹${overview?.total_collected.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'bg-green-50 text-green-600',
      description: 'Total revenue this month'
    },
    { 
      label: 'Pending Dues', 
      value: `₹${overview?.total_pending.toLocaleString()}`, 
      icon: CreditCard, 
      color: 'bg-orange-50 text-orange-600',
      description: 'Awaiting collection'
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Intelligence Dashboard</h1>
        <p className="text-slate-500">Real-time overview of your hostel operations.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={cn("rounded-lg p-2.5", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
              <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Branch-wise Occupancy */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Branch Occupancy</h3>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-6">
            {occupancy.map((branch) => (
              <div key={branch.branchName}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">{branch.branchName}</span>
                  <span className="text-slate-500">{branch.occupied} / {branch.total} Beds</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      Number(branch.percentage) > 80 ? "bg-orange-500" : "bg-blue-600"
                    )}
                    style={{ width: `${branch.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Critical Dues</h3>
            <ArrowDownRight className="h-5 w-5 text-red-500" />
          </div>
          <div className="space-y-4">
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No pending payments. Good job!</p>
            ) : (
              pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.tenantName}</p>
                      <div className="flex items-center text-xs text-slate-500">
                        <Calendar className="mr-1 h-3 w-3" />
                        Due {new Date(p.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">₹{p.pending.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Remaining</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
