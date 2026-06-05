'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Calendar, 
  Bed, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Admission {
  id: string;
  tenant: { name: string };
  room: { 
    roomNumber: string;
    branch: { name: string };
  };
  checkinDate: string;
  checkoutDate: string | null;
  monthlyRent: string;
  depositAmount: string;
  status: 'ACTIVE' | 'COMPLETED';
}

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'HISTORY'>('ACTIVE');

  const fetchAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      let endpoint = '/admissions';
      if (filter === 'ACTIVE') endpoint = '/admissions/active';
      if (filter === 'HISTORY') endpoint = '/admissions/history';
      
      const { data } = await api.get(endpoint);
      if (data.success) {
        setAdmissions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admissions', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admissions</h1>
          <p className="text-slate-500">Track check-ins, check-outs, and room history.</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {(['ACTIVE', 'HISTORY', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition",
                filter === f ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Room & Branch</th>
                <th className="px-6 py-4">Check-in Date</th>
                <th className="px-6 py-4">Monthly Rent</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admissions.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{adm.tenant.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center text-slate-900 font-medium">
                        <Bed className="mr-2 h-4 w-4 text-slate-400" />
                        Room {adm.room.roomNumber}
                      </div>
                      <div className="flex items-center text-xs text-slate-500">
                        <Building className="mr-1 h-3 w-3" />
                        {adm.room.branch.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                      {format(new Date(adm.checkinDate), 'dd MMM yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">₹{Number(adm.monthlyRent).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Deposit: ₹{Number(adm.depositAmount).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      adm.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {adm.status === 'ACTIVE' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      <span>{adm.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No admissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
