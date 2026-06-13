'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, CheckCircle2, XCircle, Clock, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SuperadminSubscriptions() {
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [statsRes, reqsRes] = await Promise.all([
        api.get('/superadmin/subscription-stats'),
        api.get('/superadmin/subscription-requests')
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (reqsRes.data.success) setRequests(reqsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string, orgName: string, ownerPhone: string, plan: string) => {
    if (!confirm(`Are you sure you want to approve ${orgName}?`)) return;
    
    try {
      const res = await api.post(`/superadmin/subscription-requests/${id}/approve`);
      if (res.data.success) {
        // Send WhatsApp
        const date = new Date();
        date.setDate(date.getDate() + 30);
        const dateStr = date.toLocaleDateString();
        const msg = `✅ Your EasyPG ${plan} subscription is now active! Valid till: ${dateStr}. Thank you!`;
        window.open(`https://wa.me/91${ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        
        fetchData();
      }
    } catch (err) {
      alert('Failed to approve');
    }
  };

  const handleReject = async (id: string, ownerPhone: string) => {
    if (!rejectReason) {
      alert('Please enter a rejection reason.');
      return;
    }
    
    try {
      const res = await api.post(`/superadmin/subscription-requests/${id}/reject`, { reason: rejectReason });
      if (res.data.success) {
        const msg = `❌ Your EasyPG subscription request was rejected. Reason: ${rejectReason}. Please submit again.`;
        window.open(`https://wa.me/91${ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        
        setRejectingId(null);
        setRejectReason('');
        fetchData();
      }
    } catch (err) {
      alert('Failed to reject');
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-20 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/superadmin/dashboard" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition">
          <ArrowLeft className="h-4 w-4 text-slate-300" />
        </Link>
        <h1 className="text-2xl font-black text-white">Subscriptions</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center relative">
          {stats?.pendingRequests > 0 && (
            <span className="absolute top-3 right-3 h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
          )}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-3xl font-black text-white">{stats?.pendingRequests}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active</p>
          <p className="text-3xl font-black text-emerald-400">{stats?.activeSubscriptions}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trial</p>
          <p className="text-3xl font-black text-blue-400">{stats?.trialUsers}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Expired</p>
          <p className="text-3xl font-black text-rose-400">{stats?.expiredUsers}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center col-span-2 md:col-span-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Revenue</p>
          <p className="text-3xl font-black text-white">₹{stats?.monthlyRevenue}</p>
        </div>
      </div>

      <h2 className="text-lg font-black text-white mb-4">Pending Requests</h2>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-400 font-bold">All caught up! No pending requests.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-slate-900/50 rounded-3xl border border-slate-800 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row gap-6">
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white">{req.organization.name}</h3>
                    <p className="text-sm font-semibold text-slate-400">{req.organization.ownerName} • {req.organization.ownerPhone}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-2xl">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plan</p>
                      <p className="font-black text-white">{req.plan}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</p>
                      <p className="font-black text-white">₹{req.amount}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">UPI Reference</p>
                      <p className="font-mono font-bold text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg inline-block border border-slate-700">
                        {req.upiRefNumber}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64 flex flex-col gap-4">
                  <a href={req.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden relative group">
                    <img src={req.screenshotUrl} alt="Screenshot" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-sm">
                      View Full Image
                    </div>
                  </a>

                  {rejectingId === req.id ? (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Reason for rejection..." 
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full h-10 px-3 text-sm rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setRejectingId(null)}
                          className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleReject(req.id, req.organization.ownerPhone)}
                          className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold"
                        >
                          Confirm Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 h-12">
                      <button 
                        onClick={() => handleApprove(req.id, req.organization.name, req.organization.ownerPhone, req.plan)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => setRejectingId(req.id)}
                        className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-500 border border-rose-900/50 rounded-xl font-bold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
