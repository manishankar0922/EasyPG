'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import Image from 'next/image';
import { Loader2, Search, UserX, Phone, MapPin, GraduationCap, CreditCard, CalendarDays } from 'lucide-react';

interface VacatedProfile {
  admissionId: string;
  tenantId: string;
  name: string;
  phone: string;
  parentPhone: string | null;
  photoUrl: string | null;
  aadhaarLast4: string | null;
  aadhaarPhotoUrl: string | null;
  location: string | null;
  collegeName: string | null;
  joinedDate: string;
  vacatedDate: string | null;
  roomNumber: string;
  branchName: string | null;
  bedNumber: string | null;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function VacateHistoryPage() {
  const [profiles, setProfiles] = useState<VacatedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/tenants/vacate-history')
      .then(res => { if (res.data.success) setProfiles(res.data.data); })
      .catch(() => setError('Failed to load vacate history'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.roomNumber.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Vacate History</h1>
          <p className="text-sm text-slate-500">{profiles.length} tenant{profiles.length === 1 ? '' : 's'} moved out</p>
        </div>
        <UserX className="h-8 w-8 text-slate-300" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name, phone or room…"
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {filtered.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
          No vacated tenants{search ? ' match your search' : ' yet'}.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(p => (
          <div key={p.admissionId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                {p.photoUrl ? (
                  <Image src={p.photoUrl} alt={p.name} fill className="object-cover" />
                ) : (
                  <span className="text-xl font-black text-slate-300">{p.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 truncate">{p.name}</h3>
                  <span className="shrink-0 rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                    Vacated
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {p.branchName ? `${p.branchName} · ` : ''}Room {p.roomNumber}{p.bedNumber ? ` · Bed ${p.bedNumber}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs">Joined {fmt(p.joinedDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span className="text-xs">Vacated {fmt(p.vacatedDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <a href={`tel:${p.phone}`} className="text-xs font-semibold text-blue-600">{p.phone}</a>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs">{p.aadhaarLast4 ? `Aadhaar ••${p.aadhaarLast4}` : 'No Aadhaar'}</span>
              </div>
              {p.location && (
                <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs truncate">{p.location}</span>
                </div>
              )}
              {p.collegeName && (
                <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs truncate">{p.collegeName}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
