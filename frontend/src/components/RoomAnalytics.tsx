'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

interface RoomAnalyticsData {
  occupancyRate: number;
  expectedRent: number;
  collectedRent: number;
  pendingRent: number;
  avgTenancyMonths: number;
  turnoverLast6Months: number;
}

export default function RoomAnalytics({ roomId }: { roomId: string }) {
  const [data, setData] = useState<RoomAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/rooms/${roomId}/analytics`);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch room analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full space-y-6">
      {/* Occupancy Rate Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Occupancy Rate</h3>
            <p className="text-4xl font-black text-slate-900 mt-1">{data.occupancyRate}%</p>
          </div>
          {data.occupancyRate === 100 && (
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> Maxed
            </div>
          )}
        </div>
        <Progress 
          value={data.occupancyRate} 
          className="h-4 bg-slate-100" 
        />
      </div>

      {/* Financial Numbers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm col-span-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Rent (This Month)</p>
          <p className="text-3xl font-black text-slate-900 mt-1">₹{data.expectedRent.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Collected</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">₹{data.collectedRent.toLocaleString('en-IN')}</p>
        </div>

        <div className={`border rounded-3xl p-5 shadow-sm ${data.pendingRent > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex justify-between items-start">
            <p className={`text-xs font-bold uppercase tracking-wider ${data.pendingRent > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              Pending
            </p>
            {data.pendingRent > 0 && <AlertCircle className="w-4 h-4 text-rose-500" />}
          </div>
          <p className={`text-2xl font-black mt-1 ${data.pendingRent > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            ₹{data.pendingRent.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Historical Stats */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
        <div className="flex items-center text-slate-700">
          <Clock className="w-5 h-5 mr-3 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-bold">Average Stay</p>
            <p className="text-xs text-slate-500">Historical tenancy length</p>
          </div>
          <p className="text-lg font-black">{data.avgTenancyMonths} mo</p>
        </div>
        
        <div className="h-px w-full bg-slate-200" />
        
        <div className="flex items-center text-slate-700">
          <TrendingUp className="w-5 h-5 mr-3 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-bold">6-Month Turnover</p>
            <p className="text-xs text-slate-500">Tenants vacated recently</p>
          </div>
          <p className="text-lg font-black">{data.turnoverLast6Months}</p>
        </div>
      </div>
    </div>
  );
}
