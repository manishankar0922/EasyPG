'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate } from '@/lib/format';

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  tenant: {
    name: string;
    phone: string;
    admissions: { room: { roomNumber: string } }[];
  } | null;
}

export default function ComplaintsPage() {
  const { t, lang } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  const statusLabels: Record<string, string> = {
    ALL: t.all,
    OPEN: t.statusOpen,
    IN_PROGRESS: t.statusInProgress,
    RESOLVED: t.statusResolved,
  };

  const priorityLabels: Record<Complaint['priority'], string> = {
    HIGH: t.priorityHigh,
    MEDIUM: t.priorityMedium,
    LOW: t.priorityLow,
  };

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/complaints', {
        params: filter !== 'ALL' ? { status: filter } : {}
      });
      if (res.data.success) setComplaints(res.data.data);
    } catch (err) {
      toast.error(t.complaintsLoadFailed);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await api.patch(`/complaints/${id}`, { status: newStatus });
      if (res.data.success) {
        toast.success(t.complaintUpdated);
        fetchComplaints();
      }
    } catch (err) {
      toast.error(t.updateFailed);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.complaintsTitle}</h1>
          <p className="text-slate-500">{t.complaintsSubtitle}</p>
        </div>

        <div className="flex bg-white/70 backdrop-blur-xl p-1 rounded-2xl border border-white/60 shadow-sm overflow-x-auto scrollbar-hide">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer",
                filter === f ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-white/50"
              )}
            >
              {statusLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {loading && complaints.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <motion.div
          className="grid gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence>
            {complaints.map((complaint, i) => (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/90 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">{complaint.title}</h3>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider",
                        complaint.priority === 'HIGH' ? "bg-rose-100 text-rose-700" :
                        complaint.priority === 'MEDIUM' ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      )}>
                        {priorityLabels[complaint.priority]}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{complaint.description}</p>

                    {complaint.tenant && (
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-500 pt-2">
                        <span className="text-slate-800">{complaint.tenant.name}</span>
                        <span>•</span>
                        <span>{t.room} {complaint.tenant.admissions?.[0]?.room?.roomNumber || '—'}</span>
                        <span>•</span>
                        <span>{formatDate(complaint.createdAt, lang)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {complaint.status !== 'OPEN' && (
                      <button
                        onClick={() => updateStatus(complaint.id, 'OPEN')}
                        className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        title={t.markOpen}
                        aria-label={t.markOpen}
                      >
                        <AlertCircle className="h-5 w-5" />
                      </button>
                    )}
                    {complaint.status !== 'IN_PROGRESS' && (
                      <button
                        onClick={() => updateStatus(complaint.id, 'IN_PROGRESS')}
                        className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 transition cursor-pointer"
                        title={t.markInProgress}
                        aria-label={t.markInProgress}
                      >
                        <Clock className="h-5 w-5" />
                      </button>
                    )}
                    {complaint.status !== 'RESOLVED' && (
                      <button
                        onClick={() => updateStatus(complaint.id, 'RESOLVED')}
                        className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="h-5 w-5" /> {t.resolve}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {complaints.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-medium bg-white/40 rounded-3xl border border-white/60">
              {t.noComplaints}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
