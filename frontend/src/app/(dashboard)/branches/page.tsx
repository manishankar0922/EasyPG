'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Building2, MapPin, Bed, Users, Info } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

interface Branch {
  id: string;
  name: string;
  address: string;
  roomCount: number;
  totalCapacity: number;
  occupiedCapacity: number;
  occupancyPercentage: number;
}

export default function BranchesPage() {
  const { t } = useLanguage();

  const { data: branches = [], isLoading: loading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches');
      if (!data.success) throw new Error('Failed to fetch branches');
      return data.data as Branch[];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => (
          <Link
            key={branch.id}
            href={`/branches/${branch.id}`}
            className="group block rounded-xl bg-white p-6 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-500">Occupancy</p>
                <p className="text-lg font-bold text-slate-900">{branch.occupancyPercentage.toFixed(1)}%</p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-bold text-slate-900">{branch.name}</h3>
              <div className="mt-1 flex items-center text-sm text-slate-500">
                <MapPin className="mr-1 h-4 w-4" />
                {branch.address}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center space-x-2">
                <Bed className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">{branch.roomCount} Rooms</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">{branch.occupiedCapacity} / {branch.totalCapacity} Beds</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Structure is developer-managed: owners see, admins change */}
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
        <p className="text-sm font-medium text-slate-500">{t.viewOnlyStructure}</p>
      </div>
    </div>
  );
}
