'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Building2, Settings2, Users, Layers, ExternalLink, Power, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgTableProps {
  organisations: any[];
}

export default function OrgTable({ organisations }: OrgTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleStatus = async (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to toggle the status of this organisation?')) return;
    
    try {
      setLoadingId(orgId);
      const res = await api.patch(`/superadmin/organisations/${orgId}/toggle-status`);
      const data = res.data;
      if (data.success) {
        alert(data.message);
        window.location.reload(); // Refresh the page to reflect the new status
      } else {
        alert(data.error || 'Failed to toggle status');
      }
    } catch (error) {
      alert('Network error occurred');
    } finally {
      setLoadingId(null);
    }
  };

  if (!organisations || organisations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-slate-700/50 shadow-sm">
        <Building2 className="h-12 w-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-white">No Organisations Found</h3>
        <p className="text-slate-400 text-sm mt-1">Get started by creating your first organisation.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400 font-bold">
              <th className="px-6 py-4">Organisation</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Stats</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {organisations.map((org) => (
              <tr 
                key={org.id} 
                className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                onClick={() => router.push(`/superadmin/organisations/${org.id}`)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-900/20 border border-blue-800/30 flex items-center justify-center text-blue-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{org.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">ID: {org.id.split('-')[0]}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-white text-sm">{org.ownerName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{org.ownerPhone}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
                    <div className="flex items-center gap-1.5" title="Branches">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      <span>{org._count?.branches || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Tenants">
                      <Users className="h-4 w-4 text-emerald-400" />
                      <span>{org._count?.tenants || 0}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                    org.subscriptionStatus === 'ACTIVE' 
                      ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/30" 
                      : "bg-rose-900/20 text-rose-400 border-rose-800/30"
                  )}>
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      org.subscriptionStatus === 'ACTIVE' ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                    {org.subscriptionStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(`/superadmin/organisations/${org.id}`); }}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(`/superadmin/organisations/${org.id}/rooms`); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Manage Rooms & Branches"
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(`/superadmin/organisations/${org.id}/wardens`); }}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Manage Wardens"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(`/superadmin/organisations/${org.id}/heatmap`); }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="View Heatmap"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => handleToggleStatus(org.id, e)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        org.subscriptionStatus === 'ACTIVE' 
                          ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                      )}
                      title={org.subscriptionStatus === 'ACTIVE' ? "Suspend Organisation" : "Activate Organisation"}
                      disabled={loadingId === org.id}
                    >
                      {loadingId === org.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Are you sure you want to reset the owner password for ${org.name} to the default (U9PGs@123)?`)) return;
                        try {
                          const res = await api.patch(`/superadmin/organisations/${org.id}/reset-owner-password`);
                          if (res.data.success) {
                            alert(res.data.message);
                          } else {
                            alert(res.data.error || 'Failed to reset password');
                          }
                        } catch (err: any) {
                          alert(err.response?.data?.error || 'Failed to reset password');
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Reset Owner Password to Default"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
