'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Bed, Building, Users, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Branch {
  id: string;
  name: string;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    branchId: '',
    roomNumber: '',
    roomType: 'DOUBLE',
    totalCapacity: 2,
    rentAmount: '',
    genderType: 'BOYS',
  });

  useEffect(() => {
    async function fetchBranches() {
      try {
        const { data } = await api.get('/branches');
        if (data.success) {
          setBranches(data.data);
          if (data.data.length > 0) {
            setFormData(prev => ({ ...prev, branchId: data.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    }
    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchId) {
      setError('A branch is required to create a room.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/rooms', {
        ...formData,
        totalCapacity: Number(formData.totalCapacity),
        rentAmount: Number(formData.rentAmount)
      });
      if (data.success) {
        router.push('/rooms');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div className="flex items-center space-x-4">
        <Link href="/rooms" className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition">
          <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Room</h1>
          <p className="text-sm text-slate-500">Register a new room and its capacity to a specific branch.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
        <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Inventory Management</h2>
        </div>

        {branches.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Branches Available</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                You must create at least one branch before you can add rooms to your inventory.
              </p>
            </div>
            <Link 
              href="/branches/create"
              className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
            >
              <span>Create Your First Branch</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Branch</label>
                <div className="relative group">
                  <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Room Number</label>
                <div className="relative group">
                  <Bed className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, A-1"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Room Type</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 px-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={formData.roomType}
                  onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                >
                  <option value="SINGLE">Single Sharing</option>
                  <option value="DOUBLE">Double Sharing</option>
                  <option value="TRIPLE">Triple Sharing</option>
                  <option value="FOUR_SHARE">Four Sharing</option>
                  <option value="CUSTOM">Custom Capacity</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Total Capacity (Beds)</label>
                <div className="relative group">
                  <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={formData.totalCapacity}
                    onChange={(e) => setFormData({ ...formData, totalCapacity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Rent Amount (per Month)</label>
                <div className="relative group">
                  <span className="absolute left-4 top-3 font-bold text-slate-400 group-focus-within:text-blue-500">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="5000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-8 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
                    value={formData.rentAmount}
                    onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Gender Allocation</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 px-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                  value={formData.genderType}
                  onChange={(e) => setFormData({ ...formData, genderType: e.target.value })}
                >
                  <option value="BOYS">Boys Only</option>
                  <option value="GIRLS">Girls Only</option>
                  <option value="UNISEX">Unisex (Mixed)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-center space-x-3 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:translate-y-[-1px] active:translate-y-[1px] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Adding Room...</span>
                  </div>
                ) : 'Confirm & Add Room'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
