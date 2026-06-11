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

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [address, setAddress] = useState('');

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setLoading(true);
    try {
      const { data } = await api.post('/admin/organizations', {
        name, ownerName, ownerPhone, email: ownerEmail, address,
      });

      if (data.success) {
        const summary = data.data;
        setSuccess(`Organisation "${summary.org.name}" created successfully!`);
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
                  <textarea rows={3} placeholder="Complete postal address of the main property..." required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm resize-none"
                    value={address} onChange={e => setAddress(e.target.value)} />
                </div>
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
