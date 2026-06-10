'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Building2, User, Phone, MapPin, Layers, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type FloorConfig = { floorNumber: number; roomCount: number };

export default function NewOrganisationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState<number | ''>('');
  const [floors, setFloors] = useState<FloorConfig[]>([]);

  // Subscription defaults
  const [plan, setPlan] = useState('TRIAL');
  const [maxBranches, setMaxBranches] = useState(3);
  const [maxRooms, setMaxRooms] = useState(50);

  // ── Floor helpers ──────────────────────────────────────────────────────
  const handleFloorsChange = (val: string) => {
    const num = parseInt(val, 10);
    if (val === '') { setNumberOfFloors(''); setFloors([]); return; }
    setNumberOfFloors(num);
    if (isNaN(num) || num < 1 || num > 20) return;
    setFloors(prev => {
      const next = [...prev];
      if (num > next.length) {
        for (let i = next.length; i < num; i++) {
          next.push({ floorNumber: i + 1, roomCount: 10 });
        }
      } else {
        next.splice(num);
      }
      return next;
    });
  };

  const updateRoomCount = (idx: number, val: number) => {
    setFloors(prev => prev.map((f, i) => i === idx ? { ...f, roomCount: val } : f));
  };

  const totalRooms = floors.reduce((a, f) => a + f.roomCount, 0);
  const totalBeds = totalRooms * 3; // 3 beds per room default

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (floors.length > 0) {
      for (const f of floors) {
        if (!f.roomCount || f.roomCount < 1) {
          setError('Please set room count for every floor.'); return;
        }
      }
    }

    setLoading(true);
    try {
      const { data } = await api.post('/admin/organizations', {
        name, ownerName, ownerPhone, email: ownerEmail, address,
        subscriptionPlan: plan,
        maxBranches: Number(maxBranches),
        maxRooms: Number(maxRooms),
        floors: floors.length > 0 ? floors : undefined,
      });

      if (data.success) {
        const summary = data.data;
        setSuccess(
          `Organisation "${summary.org.name}" created! ` +
          (summary.roomsCreated > 0
            ? `${summary.roomsCreated} rooms & ${summary.bedsCreated} beds provisioned.`
            : 'No rooms provisioned (floors not configured).')
        );
        setTimeout(() => router.push('/admin'), 2200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create organisation');
    } finally {
      setLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top nav */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Link href="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 hover:bg-slate-700 transition">
              <ArrowLeft className="h-4 w-4 text-slate-300" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-wide">Create Organisation</h1>
                <p className="text-xs text-slate-400">Super Admin · Provision New Tenant</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-4 text-emerald-400">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── ORGANISATION DETAILS ───────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Organisation Details</h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Org Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Organisation Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input type="text" required placeholder="e.g. Skyline Luxury Hostels"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>

              {/* Owner Name + Phone */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input type="text" required placeholder="Vikram Sethi"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input type="tel" required placeholder="98765 11111"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Owner Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Login Email</label>
                <input type="email" required placeholder="owner@domain.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                  value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Organisation Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <textarea rows={3} placeholder="Complete postal address of the main property..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm resize-none"
                    value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* ── FLOOR & ROOM SETUP ────────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Floor & Room Setup</h2>
              <p className="text-xs text-slate-500 mt-0.5">Each room will auto-get 3 beds (Bed A, Bed B, Bed C). You can update rent later.</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Floor count */}
              <div className="space-y-1.5 max-w-xs">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Number of Floors</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input type="number" min="1" max="20" placeholder="e.g. 4"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={numberOfFloors} onChange={e => handleFloorsChange(e.target.value)} />
                </div>
              </div>

              {/* Floor rows */}
              {floors.length > 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-700 overflow-hidden">
                    {floors.map((floor, idx) => (
                      <div key={idx}
                        className={cn(
                          'flex items-center gap-4 px-4 py-3',
                          idx !== floors.length - 1 && 'border-b border-slate-700/60'
                        )}>
                        <span className="w-20 text-sm font-semibold text-slate-300 shrink-0">
                          Floor {floor.floorNumber}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Rooms</span>
                          <input type="number" min="1" max="99"
                            value={floor.roomCount}
                            onChange={e => updateRoomCount(idx, parseInt(e.target.value, 10) || 0)}
                            className="w-20 h-10 text-center rounded-lg border border-slate-700 bg-slate-950 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold" />
                        </div>
                        <span className="ml-auto text-xs text-slate-500">
                          = {floor.roomCount * 3} beds
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Live summary */}
                  <div className="text-sm text-slate-400 text-center py-2 border border-slate-800 rounded-lg bg-slate-900/30">
                    <span className="font-bold text-white">{floors.length}</span> floors ·{' '}
                    <span className="font-bold text-white">{totalRooms}</span> rooms ·{' '}
                    <span className="font-bold text-emerald-400">{totalBeds}</span> beds provisioned
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SUBSCRIPTION PLAN ────────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Subscription Plan</h2>
            </div>
            <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                  value={plan} onChange={e => setPlan(e.target.value)}>
                  <option value="TRIAL">TRIAL</option>
                  <option value="BASIC">BASIC</option>
                  <option value="PREMIUM">PREMIUM</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Max Branches</label>
                <input type="number" min="1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                  value={maxBranches} onChange={e => setMaxBranches(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Max Rooms</label>
                <input type="number" min="1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                  value={maxRooms} onChange={e => setMaxRooms(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* ── ERROR + SUBMIT ────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <Link href="/admin"
              className="flex-1 text-center rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all">
              Cancel
            </Link>
            <button type="submit" disabled={loading}
              className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Provisioning...</span>
                : 'Create Organisation'}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
