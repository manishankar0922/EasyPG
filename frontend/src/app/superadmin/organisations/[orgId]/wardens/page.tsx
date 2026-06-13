'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, UserPlus, ShieldAlert, CheckCircle2, Copy, Send, Key, Trash2, Power, Layers } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function WardensPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [wardens, setWardens] = useState<any[]>([]);
  const [error, setError] = useState('');

  // Add Warden State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newWarden, setNewWarden] = useState({ name: '', phone: '', email: '', branchId: '' });
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/superadmin/organisations/${orgId}/wardens`);
      if (res.data.success) {
        setOrg(res.data.data.org);
        setWardens(res.data.data.wardens);
      }
    } catch (err) {
      console.error('Failed to load wardens', err);
      setError('Failed to load wardens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarden = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setError('');
    try {
      const res = await api.post('/superadmin/wardens', {
        ...newWarden,
        organisationId: orgId
      });
      if (res.data.success) {
        const branchName = org?.branches.find((b: any) => b.id === newWarden.branchId)?.name || 'Unknown Branch';
        setSuccessData({
          name: newWarden.name,
          email: newWarden.email,
          phone: newWarden.phone,
          branchName,
          password: res.data.data.tempPassword
        });
        setShowAddForm(false);
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create warden');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this warden? They will be logged out instantly.')) return;
    try {
      await api.patch(`/superadmin/wardens/${id}/deactivate`);
      fetchData();
    } catch (err) {
      alert('Failed to deactivate warden');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm('Reset password for this warden?')) return;
    try {
      const res = await api.post(`/superadmin/wardens/${id}/reset-password`);
      if (res.data.success) {
        alert(`New password is: ${res.data.data.tempPassword}\n\nPlease share this with the warden.`);
      }
    } catch (err) {
      alert('Failed to reset password');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to completely remove this warden?')) return;
    try {
      await api.delete(`/superadmin/wardens/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to remove warden');
    }
  };

  if (loading && !org) return <LoadingScreen message="Loading wardens..." />;

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-900/50 max-w-md w-full rounded-3xl p-8 shadow-xl border border-slate-800 text-center">
          <div className="h-20 w-20 bg-emerald-900/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Warden Login Created!</h2>

          <div className="bg-slate-800/50 rounded-2xl p-5 text-left border border-slate-700 mb-8 mt-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 font-medium">Name</p>
                <p className="font-bold text-white">{successData.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Branch</p>
                <p className="font-bold text-white">{successData.branchName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Email</p>
                <p className="font-bold text-white">{successData.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Temporary Password</p>
                <p className="font-mono font-bold text-lg tracking-wider text-slate-300 bg-slate-950 inline-block px-3 py-1 rounded border border-slate-700 mt-1">{successData.password}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => {
                const text = `Hello ${successData.name}, your EasyPG warden login is ready.\nBranch: ${successData.branchName}\nEmail: ${successData.email}\nPassword: ${successData.password}\nLogin: app.easypg.in\nContact your owner if you need help.`;
                navigator.clipboard.writeText(text);
                alert('Copied to clipboard!');
              }}
              className="w-full flex items-center justify-center gap-2 h-14 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
              <Copy className="h-5 w-5" /> Copy
            </button>
            <a 
              href={`https://wa.me/91${successData.phone}?text=${encodeURIComponent(`Hello ${successData.name}, your EasyPG warden login is ready.\nBranch: ${successData.branchName}\nEmail: ${successData.email}\nPassword: ${successData.password}\nLogin: app.easypg.in\nContact your owner if you need help.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-14 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20b858] transition-colors shadow-lg shadow-[#25D366]/20"
            >
              <Send className="h-5 w-5" /> Send via WhatsApp
            </a>
            <button 
              onClick={() => {
                setSuccessData(null);
                setNewWarden({ name: '', phone: '', email: '', branchId: '' });
              }}
              className="w-full flex items-center justify-center h-14 bg-transparent text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-colors mt-2"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-32">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/superadmin/dashboard`} className="p-2 -ml-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Wardens</h1>
              <p className="text-xs font-semibold text-slate-400">{org?.name}</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Warden</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        {wardens.length === 0 ? (
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-12 text-center shadow-sm">
            <UserPlus className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">No Wardens Yet</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">Create the first warden account to start managing branches.</p>
            <button onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors">
              Create Warden
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wardens.map(w => (
              <div key={w.id} className={cn("bg-slate-900/50 rounded-2xl border p-5 shadow-sm transition-colors", w.isActive ? "border-slate-700/50" : "border-rose-900/50 bg-rose-950/20")}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0", w.isActive ? "bg-indigo-900/40 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                      {w.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{w.name}</h3>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block mt-1", w.isActive ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/30" : "bg-rose-900/20 text-rose-400 border-rose-800/30")}>
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Layers className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">{w.branch?.name || 'Unassigned'}</span>
                  </div>
                  <div className="text-sm text-slate-400 font-medium">
                    {w.phone} • {w.email}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-800">
                  <button onClick={() => handleResetPassword(w.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
                    <Key className="h-3.5 w-3.5" /> Reset Pass
                  </button>
                  <button onClick={() => handleDeactivate(w.id)} disabled={!w.isActive} className="p-2 rounded-lg text-rose-500 hover:bg-rose-900/30 border border-transparent hover:border-rose-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                    <Power className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleRemove(w.id)} className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-900/30 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ADD WARDEN BOTTOM SHEET / MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-6 transition-opacity">
          <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl transform transition-transform border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Add New Warden</h3>
              <button onClick={() => setShowAddForm(false)} className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateWarden} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-sm font-medium text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <input type="text" required placeholder="John Doe"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                  value={newWarden.name} onChange={e => setNewWarden({...newWarden, name: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                <input type="tel" required placeholder="9876543210" pattern="[0-9]{10}" maxLength={10}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                  value={newWarden.phone} onChange={e => setNewWarden({...newWarden, phone: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <input type="email" required placeholder="warden@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                  value={newWarden.email} onChange={e => setNewWarden({...newWarden, email: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Assigned Branch</label>
                <div className="flex flex-wrap gap-2">
                  {org?.branches?.map((b: any) => (
                    <button
                      key={b.id} type="button"
                      onClick={() => setNewWarden({...newWarden, branchId: b.id})}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                        newWarden.branchId === b.id 
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" 
                          : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white"
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={addLoading || !newWarden.branchId}
                className="w-full mt-4 h-12 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-blue-600/20">
                {addLoading ? 'Creating...' : 'Create Warden Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
