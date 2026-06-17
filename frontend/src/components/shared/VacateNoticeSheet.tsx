'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { CalendarIcon, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VacateNoticeSheetProps {
  tenantId: string;
  tenantName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VacateNoticeSheet({ tenantId, tenantName, isOpen, onClose, onSuccess }: VacateNoticeSheetProps) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post(`/tenants/${tenantId}/vacate-notice`, {
        plannedVacateDate: date,
        reason
      });

      if (res.data.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.data.error || 'Failed to submit notice.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity p-4">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-transform animate-in slide-in-from-bottom-4">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg font-black text-slate-900">Vacate Notice</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm font-semibold text-slate-600 leading-relaxed">
            <strong className="text-slate-900">{tenantName}</strong> is planning to leave. This will show a vacancy alert to the owner and prepare the bed for a new tenant.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expected Vacate Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-semibold text-slate-700"
                />
                <CalendarIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is the tenant leaving?"
                rows={3}
                className="w-full p-4 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm font-medium resize-none text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-colors flex items-center justify-center shadow-md shadow-orange-500/20"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Notice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
