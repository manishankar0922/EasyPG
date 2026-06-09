'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Calendar, 
  Bed, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Building,
  LogOut,
  X,
  AlertCircle
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

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [checkoutDate, setCheckoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);

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

  const openCheckoutModal = (admission: Admission) => {
    setSelectedAdmission(admission);
    setCheckoutDate(format(new Date(), 'yyyy-MM-dd'));
    setShowCheckoutModal(true);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    setSubmitting(true);
    try {
      const { data } = await api.post(`/admissions/checkout/${selectedAdmission.id}`, {
        checkoutDate
      });
      if (data.success) {
        setShowCheckoutModal(false);
        fetchAdmissions();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

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

      {loading && admissions.length === 0 ? (
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
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
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
                    <span className={cn(
                      "inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      adm.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {adm.status === 'ACTIVE' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      <span>{adm.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {adm.status === 'ACTIVE' && (
                      <button 
                        onClick={() => openCheckoutModal(adm)}
                        className="text-rose-600 hover:text-rose-700 font-medium flex items-center justify-end space-x-1 ml-auto"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Checkout</span>
                      </button>
                    )}
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

      {/* Checkout Modal */}
      {showCheckoutModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Confirm Checkout</h2>
                <p className="text-sm text-slate-500">{selectedAdmission.tenant.name} - Room {selectedAdmission.room.roomNumber}</p>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="rounded-full p-2 hover:bg-slate-100 transition">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="p-6 space-y-5">
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  This will mark the room as vacant and complete this admission. Ensure all dues are cleared.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Checkout Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 outline-none"
                    value={checkoutDate}
                    onChange={(e) => setCheckoutDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Finalize Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
