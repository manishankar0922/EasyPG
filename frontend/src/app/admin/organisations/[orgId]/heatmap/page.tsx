'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Loader2, AlertCircle, RefreshCw, BedDouble } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
type RoomCell = {
  roomId: string;
  roomName: string;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  rentPerBed: number;
  status: 'FULL' | 'PARTIAL' | 'VACANT' | 'INACTIVE' | 'NO_BEDS';
};
type FloorData = { floorNumber: number; rooms: RoomCell[] };

// ── Color map ──────────────────────────────────────────────────────────────────
const CELL_COLORS: Record<string, string> = {
  FULL:     'bg-emerald-500 border-emerald-600 text-white',
  PARTIAL:  'bg-yellow-400 border-yellow-500 text-slate-900',
  VACANT:   'bg-red-100 border-red-300 text-red-700',
  INACTIVE: 'bg-slate-700 border-slate-600 text-slate-400',
  NO_BEDS:  'bg-slate-800 border-slate-700 text-slate-500',
};
const STATUS_LABEL: Record<string, string> = {
  FULL:     'Full',
  PARTIAL:  'Partial',
  VACANT:   'Vacant',
  INACTIVE: 'Inactive',
  NO_BEDS:  'No Beds',
};
const STATUS_DOT: Record<string, string> = {
  FULL:     'bg-emerald-400',
  PARTIAL:  'bg-yellow-400',
  VACANT:   'bg-red-400',
  INACTIVE: 'bg-slate-500',
  NO_BEDS:  'bg-slate-600',
};

// ── Popover ────────────────────────────────────────────────────────────────────
function RoomPopover({
  room,
  orgId,
  anchorRef,
  onClose,
}: {
  room: RoomCell;
  orgId: string;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={popRef}
      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700" />

      <div className="p-4 space-y-3">
        {/* Room name + status */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-white">Room {room.roomName}</span>
          <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            room.status === 'FULL' ? 'bg-emerald-500/20 text-emerald-400' :
            room.status === 'PARTIAL' ? 'bg-yellow-400/20 text-yellow-400' :
            room.status === 'VACANT' ? 'bg-red-500/20 text-red-400' :
            'bg-slate-700 text-slate-400'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[room.status])} />
            {STATUS_LABEL[room.status]}
          </span>
        </div>

        {/* Stats */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Total beds</span>
            <span className="font-bold">{room.totalBeds}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Occupied</span>
            <span className="font-bold text-emerald-400">{room.occupiedBeds}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Vacant</span>
            <span className="font-bold text-red-400">{room.vacantBeds}</span>
          </div>
          {room.rentPerBed > 0 && (
            <div className="flex justify-between text-slate-300 border-t border-slate-700/60 pt-1.5 mt-1.5">
              <span className="text-slate-500">Rent / month</span>
              <span className="font-bold text-white">₹{room.rentPerBed.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Edit Room CTA */}
        <Link
          href={`/admin/organisations/${orgId}/rooms`}
          onClick={onClose}
          className="block w-full text-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 py-2 text-xs font-semibold transition"
        >
          Edit Room →
        </Link>
      </div>
    </div>
  );
}

// ── Room Cell ──────────────────────────────────────────────────────────────────
function Cell({
  room,
  orgId,
}: {
  room: RoomCell;
  orgId: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative flex items-center justify-center">
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex flex-col items-center justify-center min-w-[56px] min-h-[56px] w-14 h-14 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md',
          CELL_COLORS[room.status] ?? CELL_COLORS.INACTIVE,
        )}
        title={`Room ${room.roomName}: ${room.occupiedBeds}/${room.totalBeds} beds`}
      >
        <span className="leading-none">{room.roomName}</span>
        {room.totalBeds > 0 && (
          <span className="text-[9px] opacity-80 font-medium mt-0.5 leading-none">
            {room.occupiedBeds}/{room.totalBeds}
          </span>
        )}
      </button>

      {open && (
        <RoomPopover
          room={room}
          orgId={orgId}
          anchorRef={btnRef}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ── AdminHeatmap Component ─────────────────────────────────────────────────────
export function AdminHeatmap({ orgId }: { orgId: string }) {
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/organisations/${orgId}/heatmap`);
      if (data.success) setFloors(data.data.floors);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // Aggregate legend counts
  const counts = { FULL: 0, PARTIAL: 0, VACANT: 0, INACTIVE: 0, NO_BEDS: 0 };
  floors.forEach(f => f.rooms.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; }));
  const totalRooms = Object.values(counts).reduce((a, b) => a + b, 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Building heatmap...</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <div className="text-sm flex-1">{error}</div>
      <button onClick={load} className="text-xs font-semibold hover:text-red-300 flex items-center gap-1">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );

  if (floors.length === 0) return (
    <div className="text-center py-16 text-slate-500">
      <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="font-semibold">No rooms found</p>
      <p className="text-sm mt-1">Create rooms first from the Room Editor.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Legend + stats row */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs text-slate-500 font-medium">{totalRooms} rooms total</span>
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'FULL',    label: 'Full',     color: 'bg-emerald-500' },
            { key: 'PARTIAL', label: 'Partial',  color: 'bg-yellow-400' },
            { key: 'VACANT',  label: 'Vacant',   color: 'bg-red-300' },
            { key: 'NO_BEDS', label: 'No Beds',  color: 'bg-slate-700' },
            { key: 'INACTIVE',label: 'Inactive', color: 'bg-slate-600' },
          ].map(({ key, label, color }) => counts[key as keyof typeof counts] > 0 && (
            <span key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={cn('h-3 w-3 rounded-sm border border-white/10', color)} />
              {label} <span className="font-bold text-slate-200">{counts[key as keyof typeof counts]}</span>
            </span>
          ))}
        </div>
        <button onClick={load}
          className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Floors */}
      {floors.map(floor => (
        <section key={floor.floorNumber}>
          {/* Floor label */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full shrink-0">
              Floor {floor.floorNumber}
            </span>
            <span className="text-xs text-slate-500">{floor.rooms.length} rooms</span>
            <div className="flex-1 h-px bg-slate-800" />
            {/* Mini bar */}
            <div className="hidden sm:flex h-2 w-32 rounded-full overflow-hidden bg-slate-800 shrink-0">
              {(() => {
                const full = floor.rooms.filter(r => r.status === 'FULL').length;
                const partial = floor.rooms.filter(r => r.status === 'PARTIAL').length;
                const total = floor.rooms.length || 1;
                return (
                  <>
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(full / total) * 100}%` }} />
                    <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(partial / total) * 100}%` }} />
                  </>
                );
              })()}
            </div>
          </div>

          {/* Room grid — auto-fill wrapping */}
          <div className="flex flex-wrap gap-2">
            {floor.rooms.map(room => (
              <Cell key={room.roomId} room={room} orgId={orgId} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function OrgHeatmapPage() {
  const { orgId } = useParams() as { orgId: string };
  const [orgName, setOrgName] = useState('');

  // Attempt to fetch org name gracefully
  useEffect(() => {
    api.get(`/admin/organizations`)
      .then(res => {
        if (res.data.success) {
          const org = res.data.data.find((o: any) => o.id === orgId);
          if (org) setOrgName(org.name);
        }
      })
      .catch(() => {});
  }, [orgId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-4">
            <Link href={`/admin/organisations/${orgId}/rooms`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition">
              <ArrowLeft className="h-4 w-4 text-slate-300" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">
                  {orgName ? `${orgName} — Room Overview` : 'Room Overview'}
                </h1>
                <p className="text-xs text-slate-400">Super Admin · Live Heatmap</p>
              </div>
            </div>
            <Link
              href={`/admin/organisations/${orgId}/rooms`}
              className="ml-auto hidden sm:flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition"
            >
              Edit Rooms →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AdminHeatmap orgId={orgId} />
      </main>
    </div>
  );
}
