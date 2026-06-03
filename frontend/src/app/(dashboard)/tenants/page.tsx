'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  School, 
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  collegeName: string;
  status: string;
  admissions: any[];
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenants() {
      try {
        const { data } = await api.get(`/tenants?search=${search}`);
        if (data.success) {
          setTenants(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch tenants', err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(fetchTenants, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <Link 
          href="/tenants/create" 
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Tenant</span>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Tenant Name</th>
              <th className="px-6 py-4">College / Organization</th>
              <th className="px-6 py-4">Current Room</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{tenant.name}</p>
                    <p className="flex items-center text-xs text-slate-500">
                      <Phone className="mr-1 h-3 w-3" />
                      {tenant.phone}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-slate-600">
                    <School className="mr-2 h-4 w-4 text-slate-400" />
                    {tenant.collegeName || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {tenant.admissions?.[0]?.room 
                    ? `Room ${tenant.admissions[0].room.roomNumber} (${tenant.admissions[0].room.branch.name})`
                    : 'Unassigned'}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    tenant.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {tenant.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/tenants/${tenant.id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Profile
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tenants.length === 0 && !loading && (
          <div className="py-12 text-center text-slate-500">
            No tenants found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
