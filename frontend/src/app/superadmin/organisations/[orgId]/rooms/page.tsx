'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Pencil, Loader2, BedDouble, AlertCircle, ShieldCheck, Plus, Trash2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import DevLoader from '@/components/superadmin/DevLoader';

// ── Types ──────────────────────────────────────────────────────────────────────
type Bed = { id: string; bedNumber: string; isOccupied: boolean };
type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  totalCapacity: number;
  occupiedCapacity: number;
  rentAmount: string | number;
  beds: Bed[];
};
type FloorGroup = { floor: number; rooms: Room[] };
type BranchOption = { id: string; name: string };

// ── Room Chip ──────────────────────────────────────────────────────────────────
function RoomChip({ room, onEdit }: { room: Room; onEdit: (r: Room) => void }) {
  const vacant = room.totalCapacity - room.occupiedCapacity;
  const isFull = vacant === 0;

  return (
    <div className={cn(
      'flex items-center justify-between rounded-xl border px-4 py-3 transition',
      isFull
        ? 'border-red-900/40 bg-red-950/20'
        : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/70'
    )}>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">{room.roomNumber}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {room.occupiedCapacity}/{room.totalCapacity} beds
          {Number(room.rentAmount) > 0 && (
            <span className="ml-2 text-emerald-400 font-semibold">₹{Number(room.rentAmount).toLocaleString('en-IN')}/mo</span>
          )}
        </p>
      </div>
      <button
        onClick={() => onEdit(room)}
        className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 hover:border-emerald-500 hover:bg-emerald-950/30 hover:text-emerald-400 text-slate-400 transition"
        title="Edit room"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Edit Sheet ─────────────────────────────────────────────────────────────────
function EditSheet({
  room,
  onClose,
  onSaved,
  onDeleted,
}: {
  room: Room;
  onClose: () => void;
  onSaved: (updated: Room) => void;
  onDeleted: (roomId: string) => void;
}) {
  const [bedCount, setBedCount] = useState(room.totalCapacity);
  const [rent, setRent] = useState(Number(room.rentAmount));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setError('');
    setDeleting(true);
    try {
      const { data } = await api.delete(`/admin/rooms/${room.id}`);
      if (data.success) {
        onDeleted(room.id);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete room');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/rooms/${room.id}`, {
        bedCount: Number(bedCount),
        rentPerBed: Number(rent),
      });
      if (data.success) {
        onSaved(data.data as Room);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet panel */}
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Edit Room {room.roomNumber}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Floor {room.floor} · {room.occupiedCapacity} bed(s) currently occupied</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Bed Count */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <BedDouble className="h-3.5 w-3.5" />
              Number of Beds
            </label>
            {/* Tap chips 1-8 */}
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
                const isOccupied = n < room.occupiedCapacity; // can't go below occupied count
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isOccupied}
                    onClick={() => setBedCount(n)}
                    className={cn(
                      'h-11 w-11 rounded-xl text-sm font-bold border-2 transition-all',
                      bedCount === n
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                        : isOccupied
                          ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-50'
                          : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-400'
                    )}
                    title={isOccupied ? 'Cannot reduce below occupied beds' : `${n} beds`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {room.occupiedCapacity > 0 && (
              <p className="text-xs text-amber-400">
                {room.occupiedCapacity} bed(s) are occupied — cannot select fewer than {room.occupiedCapacity}.
              </p>
            )}
          </div>

          {/* Rent */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rent per Month (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="100"
                value={rent}
                onChange={e => setRent(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
                placeholder="e.g. 5000"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 rounded-lg bg-slate-800/60 border border-slate-700 p-3 text-xs text-slate-400 flex justify-between">
          <span>Total beds: <span className="font-bold text-white">{bedCount}</span></span>
          <span>Monthly rent: <span className="font-bold text-emerald-400">₹{(rent).toLocaleString('en-IN')}</span></span>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || deleting}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
        >
          {saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
            : 'Save Changes'}
        </button>

        {/* Delete — blocked server-side while admission history exists */}
        <button
          onClick={handleDelete}
          disabled={saving || deleting}
          className={cn(
            'mt-3 w-full rounded-xl border py-2.5 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2',
            confirmDelete
              ? 'border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'border-slate-700 text-slate-400 hover:border-red-800 hover:text-red-400'
          )}
        >
          {deleting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Trash2 className="h-4 w-4" />}
          {confirmDelete ? 'Tap again to permanently delete' : 'Delete Room'}
        </button>
      </div>
    </div>
  );
}

// ── Add Room Sheet ─────────────────────────────────────────────────────────────
function AddRoomSheet({
  orgId,
  branches,
  onClose,
  onCreated,
}: {
  orgId: string;
  branches: BranchOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState(1);
  const [bedCount, setBedCount] = useState(3);
  const [rent, setRent] = useState(5000);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!branchId) return setError('Select a branch');
    if (!roomNumber.trim()) return setError('Enter a room number');
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post(`/admin/organisations/${orgId}/branches/${branchId}/rooms`, {
        roomNumber: roomNumber.trim(),
        floor: Number(floor),
        totalCapacity: Number(bedCount),
        rentAmount: Number(rent),
      });
      if (data.success) {
        onCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Add Room</h3>
            <p className="text-xs text-slate-400 mt-0.5">Creates the room with its beds, ready for admissions</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              Branch
            </label>
            <select
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 px-4 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
            >
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Room Number</label>
              <input
                type="text"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 px-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
                placeholder="e.g. 2-05"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Floor</label>
              <input
                type="number"
                min="0"
                max="100"
                value={floor}
                onChange={e => setFloor(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 px-4 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <BedDouble className="h-3.5 w-3.5" />
              Number of Beds
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBedCount(n)}
                  className={cn(
                    'h-11 w-11 rounded-xl text-sm font-bold border-2 transition-all',
                    bedCount === n
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-400'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rent per Month (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="100"
                value={rent}
                onChange={e => setRent(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
                placeholder="e.g. 5000"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
        >
          {saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating...</span>
            : 'Create Room'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OrgRoomsPage() {
  const { orgId } = useParams() as { orgId: string };
  const [floorGroups, setFloorGroups] = useState<FloorGroup[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgName, setOrgName] = useState('');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/organisations/${orgId}/rooms`);
      if (data.success) {
        // Group by floor
        const map: Record<number, Room[]> = {};
        (data.data as Room[]).forEach(room => {
          if (!map[room.floor]) map[room.floor] = [];
          map[room.floor].push(room);
        });
        const groups = Object.keys(map)
          .map(Number)
          .sort((a, b) => a - b)
          .map(floor => ({ floor, rooms: map[floor] }));
        setFloorGroups(groups);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    api.get(`/admin/organisations/${orgId}/branches`)
      .then(({ data }) => { if (data.success) setBranches(data.data); })
      .catch(() => { /* branch list is only needed for the add-room sheet */ });
  }, [orgId]);

  const handleRoomSaved = (updated: Room) => {
    setFloorGroups(prev => prev.map(fg => ({
      ...fg,
      rooms: fg.rooms.map(r => r.id === updated.id ? updated : r)
    })));
  };

  const handleRoomDeleted = (roomId: string) => {
    setFloorGroups(prev => prev
      .map(fg => ({ ...fg, rooms: fg.rooms.filter(r => r.id !== roomId) }))
      .filter(fg => fg.rooms.length > 0));
  };

  const totalRooms = floorGroups.reduce((a, fg) => a + fg.rooms.length, 0);
  const totalBeds = floorGroups.reduce((a, fg) => a + fg.rooms.reduce((b, r) => b + r.totalCapacity, 0), 0);

  if (loading) {
    return <DevLoader message="Loading rooms config..." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-4">
            <Link href="/superadmin/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition">
              <ArrowLeft className="h-4 w-4 text-slate-300" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">Room Editor</h1>
                <p className="text-xs text-slate-400">{orgName || 'Organisation'} · Super Admin</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline-flex text-xs text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                {totalRooms} rooms · {totalBeds} beds
              </span>
              <Link
                href={`/superadmin/organisations/${orgId}/branches`}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition"
              >
                <Building2 className="h-3.5 w-3.5" />
                Branches
              </Link>
              <button
                onClick={() => setAddingRoom(true)}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Room
              </button>
              <Link
                href={`/superadmin/organisations/${orgId}/heatmap`}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/30 hover:bg-emerald-950/50 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition"
              >
                View Heatmap →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        {error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : floorGroups.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <BedDouble className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">No rooms found</p>
            <p className="text-sm mt-1">This organisation has no rooms provisioned yet.</p>
          </div>
        ) : (
          floorGroups.map(fg => (
            <section key={fg.floor}>
              {/* Floor header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  Floor {fg.floor}
                </span>
                <span className="text-xs text-slate-500">{fg.rooms.length} rooms</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Room grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fg.rooms.map(room => (
                  <RoomChip key={room.id} room={room} onEdit={setEditingRoom} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Edit Sheet */}
      {editingRoom && (
        <EditSheet
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={handleRoomSaved}
          onDeleted={handleRoomDeleted}
        />
      )}

      {/* Add Room Sheet */}
      {addingRoom && (
        <AddRoomSheet
          orgId={orgId}
          branches={branches}
          onClose={() => setAddingRoom(false)}
          onCreated={loadRooms}
        />
      )}
    </div>
  );
}
