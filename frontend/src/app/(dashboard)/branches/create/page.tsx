'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateBranchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/branches', formData);
      if (data.success) {
        router.push('/branches');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create branch';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/branches" className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition">
            <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Branch</h1>
            <p className="text-sm text-slate-500">Add a physical location to your organization.</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
        <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Branch Details</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Branch Name</label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  required
                  placeholder="e.g. North Campus Hostel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none ring-offset-white focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-slate-400 ml-1">Give your branch a unique, recognizable name.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Address</label>
              <div className="relative group">
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <textarea
                  required
                  rows={4}
                  placeholder="Enter the complete postal address..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none ring-offset-white focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-center space-x-3 text-red-700">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
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
              className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:translate-y-[-1px] active:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Branch...</span>
                </div>
              ) : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
