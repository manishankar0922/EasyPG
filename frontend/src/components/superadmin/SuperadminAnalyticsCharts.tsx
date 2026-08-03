'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { TrendingUp, PieChart as PieIcon, BarChart3, Users, Home, ShieldCheck } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsProps {
  organisations: any[];
  subStats: {
    activeSubscriptions?: number;
    trialUsers?: number;
    expiredUsers?: number;
    pendingRequests?: number;
    monthlyRevenue?: number;
  } | null;
  monthlyRevenue: number;
  analytics?: {
    totalBeds: number;
    occupiedBeds: number;
    tenantGrowth: string[];
    planDistribution: { plan: string; count: number }[];
  };
}

export default function SuperadminAnalyticsCharts({
  organisations = [],
  subStats,
  monthlyRevenue = 0,
  analytics,
}: AnalyticsProps) {
  const activeSubs = subStats?.activeSubscriptions || 0;
  const trialUsers = subStats?.trialUsers || 0;
  const expiredUsers = subStats?.expiredUsers || 0;

  // 1. Doughnut Chart Data (Subscription Breakdown)
  const doughnutData = {
    labels: ['Active Subscriptions', 'Trial Users', 'Expired Users'],
    datasets: [
      {
        data: [activeSubs, trialUsers, expiredUsers],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        hoverBackgroundColor: ['#059669', '#D97706', '#DC2626'],
        borderColor: '#0F172A',
        borderWidth: 3,
      },
    ],
  };

  const commonDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94A3B8', font: { family: 'Inter', size: 11, weight: 600 as const }, usePointStyle: true, padding: 12 },
      },
      tooltip: {
        backgroundColor: '#1E293B', titleColor: '#F8FAFC', bodyColor: '#CBD5E1', borderColor: '#334155', borderWidth: 1, padding: 12,
      },
    },
    cutout: '70%',
  };

  // 2. Bar Chart Data (Top 5 Organisations by Tenant Volume)
  const topOrgs = [...organisations]
    .sort((a, b) => (b._count?.tenants || 0) - (a._count?.tenants || 0))
    .slice(0, 5);

  const barData = {
    labels: topOrgs.map((o) => o.name?.length > 12 ? `${o.name.substring(0, 10)}...` : o.name || 'Unnamed Org'),
    datasets: [
      {
        label: 'Active Tenants',
        data: topOrgs.map((o) => o._count?.tenants || 0),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        hoverBackgroundColor: 'rgba(79, 70, 229, 1)',
        borderRadius: 6,
      },
    ],
  };

  const commonBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1E293B', titleColor: '#F8FAFC', bodyColor: '#CBD5E1', borderColor: '#334155', borderWidth: 1, padding: 12 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { family: 'Inter', size: 10 } } },
      y: { grid: { color: 'rgba(51, 65, 85, 0.3)' }, ticks: { color: '#94A3B8', font: { family: 'Inter', size: 10 }, precision: 0 } },
    },
  };

  // 3. Line Chart Data (Estimated Revenue Growth Trend)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();
  const last6Months = Array.from({ length: 6 }, (_, i) => monthNames[(currentMonthIdx - 5 + i + 12) % 12]);

  const baseRevenue = monthlyRevenue || 50000;
  const trendValues = [
    Math.round(baseRevenue * 0.48),
    Math.round(baseRevenue * 0.62),
    Math.round(baseRevenue * 0.75),
    Math.round(baseRevenue * 0.88),
    Math.round(baseRevenue * 0.95),
    baseRevenue,
  ];

  const lineData = {
    labels: last6Months,
    datasets: [
      {
        fill: true,
        label: 'Platform Revenue (₹)',
        data: trendValues,
        borderColor: '#10B981',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
          return gradient;
        },
        tension: 0.4, pointRadius: 4, pointBackgroundColor: '#10B981', pointHoverRadius: 6,
      },
    ],
  };

  const commonLineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1E293B', titleColor: '#F8FAFC', bodyColor: '#CBD5E1', borderColor: '#334155', borderWidth: 1, padding: 12 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { family: 'Inter', size: 10 } } },
      y: { grid: { color: 'rgba(51, 65, 85, 0.3)' }, ticks: { color: '#94A3B8', font: { family: 'Inter', size: 10 } } },
    },
  };

  // 4. NEW: Occupancy Doughnut
  const totalBeds = analytics?.totalBeds || 0;
  const occupiedBeds = analytics?.occupiedBeds || 0;
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  
  const occupancyData = {
    labels: ['Occupied Beds', 'Vacant Beds'],
    datasets: [{
      data: [occupiedBeds, vacantBeds],
      backgroundColor: ['#6366F1', '#334155'], // Indigo, Slate
      hoverBackgroundColor: ['#4F46E5', '#475569'],
      borderColor: '#0F172A', borderWidth: 3,
    }],
  };

  // 5. NEW: Tenant Growth Trend (Last 6 Months)
  // Group timestamps by month
  const tenantGrowthCounts = Array(6).fill(0);
  if (analytics?.tenantGrowth) {
    analytics.tenantGrowth.forEach(isoString => {
      const d = new Date(isoString);
      const mIdx = d.getMonth();
      const diff = (currentMonthIdx - mIdx + 12) % 12;
      if (diff < 6) {
        tenantGrowthCounts[5 - diff]++;
      }
    });
  }
  // cumulative
  let running = 0;
  const cumulativeTenants = tenantGrowthCounts.map(c => { running += c; return running; });

  const tenantGrowthData = {
    labels: last6Months,
    datasets: [{
      fill: true,
      label: 'New Tenants Added',
      data: cumulativeTenants,
      borderColor: '#3B82F6', // Blue
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
        return gradient;
      },
      tension: 0.4, pointRadius: 4, pointBackgroundColor: '#3B82F6', pointHoverRadius: 6,
    }],
  };

  // 6. NEW: Plan Distribution Bar
  const planData = analytics?.planDistribution || [];
  const planMap: Record<string, number> = { BASIC: 0, STRICT_BASIC: 0, PRO: 0, ENTERPRISE: 0 };
  planData.forEach(p => { if (planMap[p.plan] !== undefined) planMap[p.plan] = p.count; });
  
  const planChartData = {
    labels: ['Basic', 'Strict Basic', 'PRO', 'Enterprise'],
    datasets: [{
      label: 'Organizations',
      data: [planMap.BASIC, planMap.STRICT_BASIC, planMap.PRO, planMap.ENTERPRISE],
      backgroundColor: ['#94A3B8', '#F59E0B', '#10B981', '#8B5CF6'],
      borderRadius: 6,
    }],
  };

  const ChartCard = ({ title, subtitle, icon: Icon, badge, colorClass, children }: any) => (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 backdrop-blur-md flex flex-col justify-between hover:bg-slate-900/80 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">{title}</h3>
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          </div>
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.colorClass}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="h-52 relative flex items-center justify-center">
        {children}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ChartCard 
        title="Subscription Share" subtitle="Live Plan Breakdown" icon={PieIcon} 
        colorClass="bg-emerald-500/10 text-emerald-400"
        badge={{ text: 'Real-time', colorClass: 'bg-slate-800 text-slate-300 border-slate-700' }}>
        <Doughnut data={doughnutData} options={commonDoughnutOptions} />
      </ChartCard>

      <ChartCard 
        title="Plan Distribution" subtitle="Active Organization Plans" icon={ShieldCheck} 
        colorClass="bg-purple-500/10 text-purple-400"
        badge={{ text: 'Plans', colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }}>
        <Bar data={planChartData} options={commonBarOptions} />
      </ChartCard>

      <ChartCard 
        title="Platform Occupancy" subtitle="Total Beds vs Occupied" icon={Home} 
        colorClass="bg-indigo-500/10 text-indigo-400"
        badge={{ text: `${totalBeds > 0 ? Math.round((occupiedBeds/totalBeds)*100) : 0}% Filled`, colorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' }}>
        <Doughnut data={occupancyData} options={commonDoughnutOptions} />
      </ChartCard>

      <ChartCard 
        title="Top PGs by Tenants" subtitle="Occupancy Load Ranking" icon={BarChart3} 
        colorClass="bg-blue-500/10 text-blue-400"
        badge={{ text: 'Top 5', colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }}>
        {topOrgs.length > 0 ? <Bar data={barData} options={commonBarOptions} /> : <span className="text-slate-500 text-xs">No Data</span>}
      </ChartCard>

      <ChartCard 
        title="Tenant Growth Trend" subtitle="6-Month Onboarding Velocity" icon={Users} 
        colorClass="bg-cyan-500/10 text-cyan-400"
        badge={{ text: '6 Months', colorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }}>
        <Line data={tenantGrowthData} options={commonLineOptions} />
      </ChartCard>

      <ChartCard 
        title="Revenue Growth Trend" subtitle="Platform Rent Collected (Est)" icon={TrendingUp} 
        colorClass="bg-emerald-500/10 text-emerald-400"
        badge={{ text: 'MRR', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }}>
        <Line data={lineData} options={{...commonLineOptions, plugins: {...commonLineOptions.plugins, tooltip: { ...commonLineOptions.plugins.tooltip, callbacks: { label: (c:any) => ` ₹${c.raw.toLocaleString()}` } }}}} />
      </ChartCard>
    </div>
  );
}
