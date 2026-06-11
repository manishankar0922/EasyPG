'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Plus, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

type FilterType = 'ALL' | 'PAID' | 'UNPAID' | 'NEW';

export default function TenantsMobilePage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const { user } = useAuthStore();

  useEffect(() => {
    async function fetchTenants() {
      try {
        setLoading(true);
        // Map our simple UI filters to API params
        let statusParam = '';
        let newParam = '';
        if (activeFilter === 'PAID') statusParam = 'PAID';
        if (activeFilter === 'UNPAID') statusParam = 'UNPAID';
        if (activeFilter === 'NEW') newParam = 'true';

        const res = await api.get('/tenants', {
          params: {
            search: searchQuery,
            paymentStatus: statusParam,
            newThisMonth: newParam,
            branchId: user?.branchId || ''
          }
        });

        if (res.data.success) {
          setTenants(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch tenants', err);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchTenants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, user]);

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 sticky top-0 z-10 shadow-sm space-y-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Tenants</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-slate-100 border-none rounded-2xl pl-11 pr-4 text-base font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PAID', label: 'Paid ✅' },
            { id: 'UNPAID', label: 'Not Paid ❌' },
            { id: 'NEW', label: 'New This Month' }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as FilterType)}
              className={cn(
                "h-10 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 border",
                activeFilter === chip.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <User className="h-12 w-12 text-blue-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No tenants yet</h3>
            <p className="text-slate-500 mb-8">
              {searchQuery ? "Try searching for a different name." : "Add your first tenant to get started!"}
            </p>
            {!searchQuery && (
              <Link 
                href="/tenants/new"
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
              >
                Add First Tenant
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map(tenant => (
              <Link 
                href={`/tenants/${tenant.id}`} 
                key={tenant.id}
                className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden relative">
                    {tenant.photoUrl ? (
                      <Image src={tenant.photoUrl} alt={tenant.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400 font-bold text-lg">
                        {tenant.name.substring(0, 1)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-base truncate">{tenant.name}</p>
                    <p className="text-sm font-semibold text-slate-500">
                      Room {tenant.roomNumber} {tenant.bedName ? `· Bed ${tenant.bedName}` : ''}
                    </p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      Since {new Date(tenant.moveInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {tenant.paymentStatus === 'PAID' ? (
                      <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100/50">
                        Paid ✅
                      </div>
                    ) : (
                      <div className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-rose-100/50">
                        ₹{tenant.rentPending} due
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Floating Action Button */}
      <Link
        href="/tenants/new"
        className="fixed bottom-24 right-5 h-[60px] w-[60px] bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 active:scale-90 transition-transform z-40"
      >
        <Plus className="h-8 w-8" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
