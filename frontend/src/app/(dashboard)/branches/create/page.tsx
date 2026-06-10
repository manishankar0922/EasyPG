'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Loader2, ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// A single group of rooms on a floor (e.g. "5 rooms, 3-Share")
type RoomGroup = {
  roomCount: number;
  bedsPerRoom: number;
};

// A floor has multiple room groups to support mixed sharing types
type FloorConfig = {
  floorNumber: number;
  groups: RoomGroup[];
};

// Flat shape sent to the backend — one entry per group
type FloorPayload = {
  floorNumber: number;
  roomCount: number;
  bedsPerRoom: number;
};

export default function CreateBranchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [numberOfFloors, setNumberOfFloors] = useState<number | ''>('');
  const [floors, setFloors] = useState<FloorConfig[]>([]);

  // ── Floor count ────────────────────────────────────────────────────────
  const handleFloorsChange = (val: string) => {
    const num = parseInt(val, 10);
    if (val === '') { setNumberOfFloors(''); setFloors([]); return; }
    setNumberOfFloors(num);
    if (isNaN(num) || num < 1 || num > 20) return;
    setFloors(prev => {
      const next = [...prev];
      if (num > next.length) {
        for (let i = next.length; i < num; i++) {
          next.push({ floorNumber: i + 1, groups: [{ roomCount: 10, bedsPerRoom: 3 }] });
        }
      } else {
        next.splice(num);
      }
      return next;
    });
  };

  // ── Group helpers ──────────────────────────────────────────────────────
  const updateGroup = (fi: number, gi: number, field: keyof RoomGroup, value: number) => {
    setFloors(prev => prev.map((f, idx) => idx !== fi ? f : {
      ...f,
      groups: f.groups.map((g, gidx) => gidx !== gi ? g : { ...g, [field]: value })
    }));
  };

  const addGroup = (fi: number) => {
    setFloors(prev => prev.map((f, idx) => idx !== fi ? f : {
      ...f, groups: [...f.groups, { roomCount: 5, bedsPerRoom: 3 }]
    }));
  };

  const removeGroup = (fi: number, gi: number) => {
    setFloors(prev => prev.map((f, idx) => idx !== fi ? f : {
      ...f, groups: f.groups.filter((_, gidx) => gidx !== gi)
    }));
  };

  // ── Summary ────────────────────────────────────────────────────────────
  const summary = (() => {
    let totalRooms = 0, totalBeds = 0;
    floors.forEach(f => f.groups.forEach(g => {
      totalRooms += g.roomCount;
      totalBeds += g.roomCount * g.bedsPerRoom;
    }));
    return { totalRooms, totalBeds };
  })();

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (typeof numberOfFloors !== 'number' || numberOfFloors < 1) {
      setError('Please complete all floor details'); return;
    }
    for (const f of floors) {
      if (!f.groups.length) { setError('Please complete all floor details'); return; }
      for (const g of f.groups) {
        if (!g.roomCount || g.roomCount < 1 || !g.bedsPerRoom) {
          setError('Please complete all floor details'); return;
        }
      }
    }
    setLoading(true);
    try {
      const flatFloors: FloorPayload[] = [];
      floors.forEach(f => f.groups.forEach(g => {
        flatFloors.push({ floorNumber: f.floorNumber, roomCount: g.roomCount, bedsPerRoom: g.bedsPerRoom });
      }));
      const { data } = await api.post('/branches', { ...formData, floors: flatFloors });
      if (data.success) router.push('/branches');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Page header */}
      <div className="flex items-center space-x-4">
        <Link href="/branches"
          className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition">
          <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Branch</h1>
          <p className="text-sm text-slate-500">Add a physical location to your organization.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={handleSubmit}>

          {/* ── BRANCH DETAILS ───────────────────────────── */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Branch Details</h2>
          </div>
          <div className="p-8 space-y-5">
            {/* Branch Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Branch Name</label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" required placeholder="e.g. North Campus Hostel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <p className="text-[11px] text-slate-400 ml-1">Give your branch a unique, recognizable name.</p>
            </div>
            {/* Full Address */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Address</label>
              <div className="relative group">
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <textarea required rows={3} placeholder="Enter the complete postal address..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>
          </div>

          {/* ── FLOOR & ROOM SETUP ───────────────────────── */}
          <div className="border-t border-b border-slate-100 bg-slate-50/50 px-8 py-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Floor & Room Setup</h2>
          </div>
          <div className="p-8 space-y-6">
            {/* Floor count input */}
            <div className="space-y-2 max-w-xs">
              <label className="text-sm font-semibold text-slate-700">Number of Floors</label>
              <input type="number" min="1" max="20" placeholder="e.g. 3"
                value={numberOfFloors}
                onChange={e => handleFloorsChange(e.target.value)}
                className="w-full h-12 rounded-lg border border-slate-200 px-4 text-sm bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
            </div>

            {/* Floor cards */}
            {floors.length > 0 && (
              <div className="space-y-4">
                {floors.map((floor, fi) => (
                  <div key={fi} className="rounded-xl border border-slate-200 overflow-hidden">

                    {/* Floor header bar */}
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <span className="text-sm font-bold text-slate-700">Floor {floor.floorNumber}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {floor.groups.reduce((a, g) => a + g.roomCount, 0)} rooms ·{' '}
                        {floor.groups.reduce((a, g) => a + g.roomCount * g.bedsPerRoom, 0)} beds
                      </span>
                    </div>

                    {/* Room groups */}
                    <div className="divide-y divide-slate-100">
                      {floor.groups.map((group, gi) => (
                        <div key={gi} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">

                          {/* Room count */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm text-slate-500 w-14 font-medium">Rooms</span>
                            <input type="number" min="1" max="99"
                              value={group.roomCount || ''}
                              onChange={e => updateGroup(fi, gi, 'roomCount', parseInt(e.target.value, 10) || 0)}
                              className="w-20 h-12 text-center rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-base font-bold" />
                          </div>

                          {/* Share type chips */}
                          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
                            {[2, 3, 4, 6].map(share => (
                              <button key={share} type="button"
                                onClick={() => updateGroup(fi, gi, 'bedsPerRoom', share)}
                                className={cn(
                                  'h-11 px-4 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 shrink-0',
                                  group.bedsPerRoom === share
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                )}>
                                {share}-Share
                              </button>
                            ))}
                          </div>

                          {/* Remove group — only shown if floor has more than 1 group */}
                          {floor.groups.length > 1 && (
                            <button type="button" onClick={() => removeGroup(fi, gi)}
                              className="self-start sm:self-center h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition shrink-0"
                              title="Remove this room group">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add another room type to this floor */}
                    <div className="px-4 pb-3 pt-1">
                      <button type="button" onClick={() => addGroup(fi)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors py-1">
                        <Plus className="h-3.5 w-3.5" />
                        Add another room type on Floor {floor.floorNumber}
                      </button>
                    </div>

                  </div>
                ))}

                {/* Live summary */}
                <div className="text-sm text-slate-500 text-center py-3 border-t border-b border-slate-100">
                  Total:{' '}
                  <span className="font-bold text-slate-800">{floors.length} floors</span>
                  {' · '}
                  <span className="font-bold text-slate-800">{summary.totalRooms} rooms</span>
                  {' · '}
                  <span className="font-bold text-slate-800">{summary.totalBeds} beds</span>
                </div>
              </div>
            )}
          </div>

          {/* ── ACTIONS ──────────────────────────────────── */}
          <div className="px-8 pb-8">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 mb-6 border border-red-100 flex items-center space-x-3 text-red-700">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            <div className="flex items-center space-x-4 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => router.back()}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:translate-y-[-1px] active:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading
                  ? <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" /><span>Creating Branch...</span>
                    </div>
                  : 'Create Branch'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
