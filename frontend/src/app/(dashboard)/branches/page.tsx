'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Building2, MapPin, Bed, Users, Plus } from 'lucide-react';
import Link from 'next/link';

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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const { data } = await api.get('/branches');
        if (data.success) {
          setBranches(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch branches', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, []);

  if (loading) return <div>Loading branches...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
        <Link 
          href="/branches/create" 
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Branch</span>
        </Link>
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
    </div>
  );
}
