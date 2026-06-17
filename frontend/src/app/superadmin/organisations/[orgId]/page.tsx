'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Building2, Layers, Users, IndianRupee, ShieldCheck, Mail, Phone, Calendar, Loader2, Trash2, Power, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import DevLoader from '@/components/superadmin/DevLoader';

export default function OrgDetailsPage() {
  const { orgId } = useParams() as { orgId: string };
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteOrgName, setDeleteOrgName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await api.get(`/superadmin/organisations/${orgId}`);
        if (res.data.success) {
          setOrg(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch org details', error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrg();
  }, [orgId]);

  const toggleStatus = async () => {
    if (!confirm(`Are you sure you want to ${org.subscriptionStatus === 'ACTIVE' ? 'suspend' : 'activate'} this organisation?`)) return;
    try {
      setIsToggling(true);
      const res = await api.patch(`/superadmin/organisations/${orgId}/toggle-status`);
      if (res.data.success) {
        setOrg({ ...org, subscriptionStatus: org.subscriptionStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' });
      }
    } catch (error) {
      alert('Failed to toggle status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (deleteOrgName !== org.name) {
      alert('Organisation name does not match');
      return;
    }
    try {
      setIsDeleting(true);
      const res = await api.delete(`/superadmin/organisations/${orgId}`);
      if (res.data.success) {
        window.location.href = '/superadmin/dashboard';
      }
    } catch (error) {
      alert('Failed to delete organisation');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <DevLoader message="Fetching organization data..." />;
  }

  if (!org) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Building2 className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-white">Organisation not found</h2>
        <Link href="/superadmin/dashboard" className="mt-4 text-blue-500 hover:text-blue-400 font-bold">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate total beds across all branches
  const totalRooms = org.branches.reduce((acc: number, b: any) => acc + (b.rooms?.length || 0), 0);
  const totalBeds = org.branches.reduce((acc: number, b: any) => acc + (b.rooms?.reduce((rAcc: number, r: any) => rAcc + (r.beds?.length || 0), 0) || 0), 0);
  const occupiedBeds = org.branches.reduce((acc: number, b: any) => acc + (b.rooms?.reduce((rAcc: number, r: any) => rAcc + (r.beds?.filter((bed: any) => bed.isOccupied).length || 0), 0) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-4">
            <Link href="/superadmin/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition">
              <ArrowLeft className="h-4 w-4 text-slate-300" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">{org.name}</h1>
                <p className="text-xs text-slate-400">Organisation Details · Super Admin</p>
              </div>
            </div>
            
            <div className="ml-auto flex gap-2">
               <Link href={`/superadmin/organisations/${org.id}/rooms`} className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition">
                 <Layers className="h-4 w-4" /> Edit Rooms
               </Link>
               <Link href={`/superadmin/organisations/${org.id}/heatmap`} className="flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/30 hover:bg-emerald-950/50 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition">
                 View Heatmap →
               </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        
        {/* Core Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Owner Card */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Owner Information</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-tight">{org.ownerName}</p>
                  <p className="text-sm text-slate-400 flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {org.ownerPhone}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800/60 grid grid-cols-1 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    org.subscriptionStatus === 'ACTIVE' 
                      ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/30' 
                      : 'bg-rose-900/20 text-rose-400 border-rose-800/30'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${org.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {org.subscriptionStatus}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Created At</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-500" /> {new Date(org.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Platform Usage</h2>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Branches</p>
                   <p className="text-3xl font-black text-white">{org._count.branches}</p>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tenants</p>
                   <p className="text-3xl font-black text-emerald-400">{org._count.tenants}</p>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rooms</p>
                   <p className="text-3xl font-black text-indigo-400">{totalRooms}</p>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Beds (Occ/Tot)</p>
                   <p className="text-xl font-black text-white">{occupiedBeds} <span className="text-sm text-slate-500 font-medium">/ {totalBeds}</span></p>
                </div>
             </div>
          </div>
        </div>

        {/* Branches Section */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="border-b border-slate-700/50 bg-slate-800/30 px-6 py-4">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Configured Branches</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {org.branches.map((branch: any) => {
              const uniqueFloors = new Set(branch.rooms?.map((r: any) => r.floor) || []).size;
              const displayFloors = Math.max(branch.floors || 0, uniqueFloors);
              return (
                <div key={branch.id} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-900/20 border border-blue-800/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">{branch.name}</h3>
                      <p className="text-sm text-slate-400 mt-1 max-w-sm leading-snug">{branch.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="text-center bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
                       <p className="text-xs font-bold text-slate-500 uppercase">Floors</p>
                       <p className="text-lg font-black text-white leading-none mt-1">{displayFloors}</p>
                    </div>
                  <div className="text-center bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
                     <p className="text-xs font-bold text-slate-500 uppercase">Rooms</p>
                     <p className="text-lg font-black text-white leading-none mt-1">{branch.rooms?.length || 0}</p>
                  </div>
                </div>
              </div>
              );
            })}
            
            {org.branches.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-500 font-bold">No branches configured yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-950/20 rounded-2xl border border-rose-900/50 overflow-hidden mt-8">
          <div className="border-b border-rose-900/50 bg-rose-950/40 px-6 py-4 flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-rose-500" />
             <h2 className="text-sm font-black uppercase tracking-widest text-rose-500">Danger Zone</h2>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rose-900/30">
              <div>
                <h3 className="text-white font-bold mb-1">Suspend Organisation</h3>
                <p className="text-slate-400 text-sm">Temporarily block access for all users, wardens, and tenants.</p>
              </div>
              <button 
                onClick={toggleStatus}
                disabled={isToggling}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition border border-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Power className="h-4 w-4" />
                {org.subscriptionStatus === 'ACTIVE' ? 'Suspend Access' : 'Activate Access'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-bold mb-1">Delete Organisation</h3>
                <p className="text-slate-400 text-sm max-w-md">Permanently delete this organisation and all its data (branches, rooms, tenants, payments, etc.). This cannot be undone.</p>
              </div>
              
              {!showDeleteConfirm ? (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 rounded-lg font-bold text-sm transition border border-rose-900/50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Organisation
                </button>
              ) : (
                <div className="bg-slate-900 border border-rose-900/50 p-4 rounded-xl w-full sm:w-80">
                  <p className="text-xs font-bold text-rose-400 mb-2 uppercase tracking-wider">Type to confirm</p>
                  <p className="text-sm text-slate-300 mb-3">Please type <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded select-all">{org.name}</strong> to confirm.</p>
                  <input 
                    type="text" 
                    placeholder={org.name}
                    value={deleteOrgName}
                    onChange={(e) => setDeleteOrgName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteOrgName('');
                      }}
                      className="flex-1 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting || deleteOrgName !== org.name}
                      className="flex-1 px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition disabled:opacity-50 disabled:hover:bg-rose-600 flex justify-center items-center"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
