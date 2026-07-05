'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Building2, Plus, Pencil, Trash2, Loader2, AlertCircle, ShieldCheck, BedDouble, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import DevLoader from '@/components/superadmin/DevLoader';

type Branch = {
  id: string;
  name: string;
  address: string;
  _count?: { rooms: number; users: number };
};

// ── Branch create/edit sheet ───────────────────────────────────────────────────
function BranchSheet({
  orgId,
  branch,
  onClose,
  onSaved,
}: {
  orgId: string;
  branch: Branch | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(branch?.name || '');
  const [address, setAddress] = useState(branch?.address || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (name.trim().length < 2) return setError('Enter a branch name');
    if (address.trim().length < 2) return setError('Enter an address');
    setError('');
    setSaving(true);
    try {
      const { data } = branch
        ? await api.patch(`/admin/branches/${branch.id}`, { name: name.trim(), address: address.trim() })
        : await api.post(`/admin/organisations/${orgId}/branches`, { name: name.trim(), address: address.trim() });
      if (data.success) {
        onSaved();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save branch');
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
          <h3 className="text-lg font-bold text-white">{branch ? `Edit ${branch.name}` : 'Add Branch'}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-200 transition">
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
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Branch Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 px-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
              placeholder="e.g. Madhapur Branch"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 px-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
              placeholder="Street, area, city"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
        >
          {saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
            : branch ? 'Save Changes' : 'Create Branch'}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OrgBranchesPage() {
  const { orgId } = useParams() as { orgId: string };
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<{ open: boolean; branch: Branch | null }>({ open: false, branch: null });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/organisations/${orgId}/branches`);
      if (data.success) setBranches(data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (branch: Branch) => {
    if (confirmDeleteId !== branch.id) {
      setConfirmDeleteId(branch.id);
      setTimeout(() => setConfirmDeleteId(prev => (prev === branch.id ? null : prev)), 4000);
      return;
    }
    setDeletingId(branch.id);
    setError('');
    try {
      const { data } = await api.delete(`/admin/branches/${branch.id}`);
      if (data.success) {
        setBranches(prev => prev.filter(b => b.id !== branch.id));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete branch');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (loading) return <DevLoader message="Loading branches..." />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-4">
            <Link href={`/superadmin/organisations/${orgId}/rooms`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition">
              <ArrowLeft className="h-4 w-4 text-slate-300" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">Branch Manager</h1>
                <p className="text-xs text-slate-400">Organisation structure · Super Admin</p>
              </div>
            </div>
            <button
              onClick={() => setSheet({ open: true, branch: null })}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Branch
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-4">
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {branches.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">No branches yet</p>
            <p className="text-sm mt-1">Add the organisation&apos;s first branch to start provisioning rooms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {branches.map(branch => (
              <div key={branch.id} className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-white truncate">{branch.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{branch.address}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setSheet({ open: true, branch })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 hover:border-emerald-500 hover:text-emerald-400 text-slate-400 transition"
                      title="Edit branch"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch)}
                      disabled={deletingId === branch.id}
                      className={cn(
                        'flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-bold transition',
                        confirmDeleteId === branch.id
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-red-800 hover:text-red-400'
                      )}
                      title="Delete branch (must be empty)"
                    >
                      {deletingId === branch.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                      {confirmDeleteId === branch.id && 'Confirm?'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-slate-700/50 pt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5 text-emerald-400" />
                    {branch._count?.rooms ?? 0} rooms
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-sky-400" />
                    {branch._count?.users ?? 0} staff
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-500 text-center pt-4">
          Branches with rooms or assigned staff cannot be deleted — move or remove them first.
        </p>
      </main>

      {sheet.open && (
        <BranchSheet
          orgId={orgId}
          branch={sheet.branch}
          onClose={() => setSheet({ open: false, branch: null })}
          onSaved={load}
        />
      )}
    </div>
  );
}
