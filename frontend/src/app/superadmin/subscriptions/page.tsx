'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  CheckCircle2, XCircle, Clock, Search, ChevronRight, ArrowLeft, 
  IndianRupee, CreditCard, ShieldCheck, Zap, AlertCircle, ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import DevLoader from '@/components/superadmin/DevLoader';

export default function SuperadminSubscriptions() {
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

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
        const date = new Date();
        date.setDate(date.getDate() + 30);
        const dateStr = date.toLocaleDateString();
        const msg = `✅ Your U9PGs ${plan} subscription is now active! Valid till: ${dateStr}. Thank you!`;
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
        const msg = `❌ Your U9PGs subscription request was rejected. Reason: ${rejectReason}. Please submit again.`;
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
    return <DevLoader message="Syncing payment gateways..." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 pb-24 relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="flex items-center gap-5 mb-10">
          <Link href="/superadmin/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all shadow-lg hover:shadow-white/5">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Subscription Command</h1>
            <p className="text-sm font-medium text-slate-400 mt-1">Manage platform billing and activations</p>
          </div>
        </div>

        {/* Premium Glassmorphic Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-5 rounded-3xl border border-amber-500/20 shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)] flex flex-col justify-center relative overflow-hidden group">
            {stats?.pendingRequests > 0 && (
              <span className="absolute top-4 right-4 h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)] animate-pulse" />
            )}
            <Clock className="h-6 w-6 text-amber-500 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-1">Pending</p>
            <p className="text-4xl font-black text-amber-400">{stats?.pendingRequests}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 p-5 rounded-3xl border border-emerald-500/20 shadow-sm flex flex-col justify-center overflow-hidden group">
            <ShieldCheck className="h-6 w-6 text-emerald-500 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest mb-1">Active PGs</p>
            <p className="text-4xl font-black text-emerald-400">{stats?.activeSubscriptions}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-900/10 p-5 rounded-3xl border border-blue-500/20 shadow-sm flex flex-col justify-center overflow-hidden group">
            <Zap className="h-6 w-6 text-blue-500 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-blue-500/80 uppercase tracking-widest mb-1">Trial Run</p>
            <p className="text-4xl font-black text-blue-400">{stats?.trialUsers}</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500/10 to-rose-900/10 p-5 rounded-3xl border border-rose-500/20 shadow-sm flex flex-col justify-center overflow-hidden group">
            <AlertCircle className="h-6 w-6 text-rose-500 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-rose-500/80 uppercase tracking-widest mb-1">Expired</p>
            <p className="text-4xl font-black text-rose-400">{stats?.expiredUsers}</p>
          </div>

          <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-900/10 p-5 rounded-3xl border border-violet-500/30 shadow-[0_0_30px_-10px_rgba(139,92,246,0.2)] flex flex-col justify-center col-span-2 md:col-span-1 overflow-hidden group relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl group-hover:bg-violet-400/30 transition-colors" />
            <IndianRupee className="h-6 w-6 text-violet-400 mb-3 opacity-80 group-hover:scale-110 transition-transform relative z-10" />
            <p className="text-xs font-bold text-violet-300 uppercase tracking-widest mb-1 relative z-10">Revenue</p>
            <p className="text-4xl font-black text-white relative z-10">₹{stats?.monthlyRevenue?.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-400" />
            Pending Approvals
          </h2>
        </div>

        <div className="space-y-5">
          {requests.length === 0 ? (
            <div className="bg-white/[0.02] rounded-3xl border border-white/5 p-16 text-center backdrop-blur-md shadow-2xl">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Inbox Zero</h3>
              <p className="text-slate-400 font-medium max-w-sm mx-auto">All subscription requests have been processed and approved. The platform is running smoothly.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors rounded-3xl border border-white/10 p-6 shadow-xl backdrop-blur-sm group">
                <div className="flex flex-col lg:flex-row gap-8">
                  
                  {/* Info Section */}
                  <div className="flex-1">
                    <div className="mb-6">
                      <h3 className="text-2xl font-black text-white tracking-tight mb-1">{req.organization.name}</h3>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                        <span className="text-indigo-400">{req.organization.ownerName}</span>
                        <span>•</span>
                        <span>+91 {req.organization.ownerPhone}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 min-w-[140px]">
                        <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-1.5">Selected Plan</p>
                        <p className="text-lg font-black text-indigo-300">{req.plan}</p>
                      </div>
                      
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 min-w-[140px]">
                        <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1.5">Paid Amount</p>
                        <p className="text-lg font-black text-emerald-300 flex items-center gap-1">
                          <IndianRupee className="h-4 w-4" />
                          {req.amount}
                        </p>
                      </div>

                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex-1 min-w-[200px]">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">UPI Reference Tag</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white tracking-wider">
                            {req.upiRefNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Section */}
                  <div className="w-full lg:w-72 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8">
                    
                    {/* Premium Screenshot Placeholder */}
                    <a 
                      href={req.screenshotUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`block w-full h-36 rounded-2xl border overflow-hidden relative group/img ${!req.screenshotUrl || imageError[req.id] ? 'bg-slate-900 border-slate-800 cursor-default' : 'bg-black border-white/10 cursor-pointer shadow-lg'}`}
                    >
                      {req.screenshotUrl && !imageError[req.id] ? (
                        <>
                          <img 
                            src={req.screenshotUrl} 
                            alt="Payment Proof" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110 opacity-80 group-hover/img:opacity-100" 
                            onError={() => setImageError(prev => ({ ...prev, [req.id]: true }))}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-center pb-3">
                            <span className="text-white text-xs font-bold px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
                              Verify Proof
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600">
                          <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-wider">No Proof Image</span>
                        </div>
                      )}
                    </a>

                    {rejectingId === req.id ? (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <input 
                          type="text" 
                          placeholder="Reason for rejection..." 
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full h-11 px-4 text-sm font-medium rounded-xl border border-rose-500/30 bg-rose-950/20 text-white placeholder-rose-700 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setRejectingId(null)}
                            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleReject(req.id, req.organization.ownerPhone)}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 mt-auto">
                        <button 
                          onClick={() => handleApprove(req.id, req.organization.name, req.organization.ownerPhone, req.plan)}
                          className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 rounded-xl font-black py-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-0.5"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          Approve
                        </button>
                        <button 
                          onClick={() => setRejectingId(req.id)}
                          className="flex-1 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl font-bold transition-colors"
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
    </div>
  );
}
