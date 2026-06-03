'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Bed, 
  Users, 
  IndianRupee, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

interface DashboardStats {
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await api.get('/dashboard/overview');
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  const cards = [
    { label: 'Total Rooms', value: stats?.total_rooms, icon: Bed, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Capacity', value: stats?.total_capacity, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Occupancy', value: `${stats?.occupancy_percentage}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Tenants', value: stats?.total_tenants, icon: UserCheckIcon, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const financialCards = [
    { label: 'Total Invoiced', value: stats?.total_invoiced, icon: IndianRupee, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Total Collected', value: stats?.total_collected, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Pending', value: stats?.total_pending, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div key={i} className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
              <div className={`${card.bg} ${card.color} rounded-lg p-3`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {financialCards.map((card, i) => (
          <div key={i} className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center space-x-4">
              <div className={`${card.bg} ${card.color} rounded-full p-3`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">₹{card.value?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Recent Check-ins</h3>
          <p className="mt-1 text-sm text-slate-500">Coming soon...</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Pending Invoices</h3>
          <p className="mt-1 text-sm text-slate-500">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function UserCheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
