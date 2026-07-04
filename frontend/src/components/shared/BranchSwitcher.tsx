'use client';

import { useBranch } from '@/context/BranchContext';
import { useAuthStore } from '@/store/auth-store';
import { ChevronDown, Building2, MapPin, CheckCircle2, Users } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function BranchSwitcher() {
  const { user } = useAuthStore();
  const { activeBranchId, activeBranch, branches, switchBranch } = useBranch();
  const [isOpen, setIsOpen] = useState(false);

  const role = user?.role?.toLowerCase();

  // Wardens and Superadmins do not see the branch switcher
  if (role === 'warden' || role === 'superadmin') return null;

  if (branches.length === 0) return null;

  // If 2-3 branches, show tap chips inline
  if (branches.length <= 3 && branches.length > 1) {
    return (
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/60 overflow-x-auto w-full max-w-fit">
        {branches.map(branch => (
          <button
            key={branch.id}
            onClick={() => switchBranch(branch.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              activeBranchId === branch.id 
                ? "bg-white text-blue-700 shadow-sm border border-slate-200" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent"
            )}
          >
            {branch.name}
          </button>
        ))}
      </div>
    );
  }

  // If 4+ branches or just 1 branch (shows selected state), show dropdown/bottom sheet
  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
      >
        <div className="h-6 w-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col items-start mr-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Active Branch</span>
          <span className="text-sm font-bold text-slate-800 leading-none truncate max-w-[120px] sm:max-w-[200px]">
            {activeBranch?.name || 'Select Branch'}
          </span>
        </div>
        {branches.length > 1 && <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>

      {/* Dropdown / Bottom Sheet */}
      {isOpen && branches.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-6 transition-opacity">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl transform transition-transform">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-slate-900">Switch Branch</h3>
              <button onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => {
                    switchBranch(branch.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                    activeBranchId === branch.id 
                      ? "bg-blue-50/50 border-blue-200 shadow-sm" 
                      : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      activeBranchId === branch.id ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-500"
                    )}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn("font-bold", activeBranchId === branch.id ? "text-blue-900" : "text-slate-800")}>
                        {branch.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
                        {branch.occupiedCapacity !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-emerald-500" /> {branch.occupiedCapacity} tenants
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {activeBranchId === branch.id && (
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))}

              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm font-medium text-slate-500">
                Need another branch? Contact your administrator.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
