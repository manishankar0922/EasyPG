'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { 
  Building2, Users, LayoutGrid, Plus, ShieldCheck, 
  Settings, LogOut, CheckCircle2, AlertTriangle, KeyRound, Edit, X
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  ownerName: string;
  ownerPhone: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  maxBranches: number;
  maxRooms: number;
  createdAt: string;
  ownerEmail: string | null;
  ownerId: string | null;
  stats: {
    branchesCount: number;
    roomsCount: number;
    tenantsCount: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Add Owner/Org Form State
  const [newName, setNewName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newPlan, setNewPlan] = useState('TRIAL');
  const [newMaxBranches, setNewMaxBranches] = useState(3);
  const [newMaxRooms, setNewMaxRooms] = useState(50);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edit Subscription Form State
  const [editPlan, setEditPlan] = useState('TRIAL');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editMaxBranches, setEditMaxBranches] = useState(3);
  const [editMaxRooms, setEditMaxRooms] = useState(50);

  useEffect(() => {
    // Enforce Admin Role access
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    fetchOrgs();
  }, [user]);

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/organizations');
      if (res.data.success) {
        setOrganizations(res.data.data);
      } else {
        setError('Failed to fetch organizations.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to backend api');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const res = await api.post('/admin/organizations', {
        name: newName,
        ownerName: newOwnerName,
        ownerPhone: newOwnerPhone,
        email: newOwnerEmail,
        subscriptionPlan: newPlan,
        maxBranches: newMaxBranches,
        maxRooms: newMaxRooms
      });

      if (res.data.success) {
        setIsAddOpen(false);
        // Reset state
        setNewName('');
        setNewOwnerName('');
        setNewOwnerPhone('');
        setNewOwnerEmail('');
        setNewPlan('TRIAL');
        setNewMaxBranches(3);
        setNewMaxRooms(50);
        fetchOrgs();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create organization');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (org: Organization) => {
    setSelectedOrg(org);
    setEditPlan(org.subscriptionPlan);
    setEditStatus(org.subscriptionStatus);
    setEditMaxBranches(org.maxBranches);
    setEditMaxRooms(org.maxRooms);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      const res = await api.put(`/admin/organizations/${selectedOrg.id}/subscription`, {
        subscriptionPlan: editPlan,
        subscriptionStatus: editStatus,
        maxBranches: Number(editMaxBranches),
        maxRooms: Number(editMaxRooms)
      });

      if (res.data.success) {
        setIsEditOpen(false);
        fetchOrgs();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to update subscription');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading && organizations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-400 font-medium">Loading System Admin console...</p>
        </div>
      </div>
    );
  }

  // Calculate high-level stats
  const totalOrgs = organizations.length;
  const activeSubs = organizations.filter(o => o.subscriptionStatus === 'ACTIVE').length;
  const totalBeds = organizations.reduce((acc, o) => acc + o.stats.roomsCount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar / Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide">U9 Control Center</h1>
                <p className="text-xs text-slate-400">System Admin Console</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                {user?.name}
              </span>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 hover:border-red-900 border border-slate-700 px-3 py-1.5 text-sm font-semibold transition"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Organizations</p>
                <p className="mt-2 text-3xl font-bold text-white">{totalOrgs}</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Subscriptions</p>
                <p className="mt-2 text-3xl font-bold text-white">{activeSubs}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Managed Rooms</p>
                <p className="mt-2 text-3xl font-bold text-white">{totalBeds}</p>
              </div>
              <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
                <LayoutGrid className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500"></div>
          </div>
        </div>

        {/* Organizations Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Hostel Tenants / Organizations</h2>
              <p className="text-sm text-slate-400">Configure subscription statuses, limit caps, and provision new system tenants.</p>
            </div>
            <button 
              onClick={() => setIsAddOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 hover:shadow-emerald-500/30"
            >
              <Plus className="h-5 w-5" />
              Add New Owner
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Organization / Owner</th>
                  <th className="px-6 py-4">Subscription</th>
                  <th className="px-6 py-4">Branch Cap</th>
                  <th className="px-6 py-4">Room Cap</th>
                  <th className="px-6 py-4">Current Usage</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      No organizations provisioned yet. Click "Add New Owner" to start.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white text-base">{org.name}</div>
                        <div className="text-xs text-slate-400 flex flex-col gap-0.5 mt-1">
                          <span>Owner: {org.ownerName} ({org.ownerPhone})</span>
                          <span>Email: {org.ownerEmail || 'No Login Email'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                          org.subscriptionStatus === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {org.subscriptionPlan} - {org.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{org.maxBranches}</td>
                      <td className="px-6 py-4 font-medium">{org.maxRooms}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-400 flex flex-col gap-1">
                          <div>Branches: <span className="font-semibold text-slate-200">{org.stats.branchesCount}</span></div>
                          <div>Rooms: <span className="font-semibold text-slate-200">{org.stats.roomsCount}</span></div>
                          <div>Tenants: <span className="font-semibold text-slate-200">{org.stats.tenantsCount}</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openEditModal(org)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 hover:border-emerald-600 bg-slate-800/40 hover:bg-emerald-950/20 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Limits
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add New Owner Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h3 className="text-lg font-bold text-white">Provision New Tenant & Owner</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-sm text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skyline Luxury Hostels"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Vikram Sethi"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Owner Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="98765 11111"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Login / Verification Email</label>
                <input
                  type="email"
                  required
                  placeholder="owner@domain.com"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-800 my-4 pt-4">
                <h4 className="text-sm font-bold text-white mb-3">Default Subscription Plan</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Plan</label>
                    <select
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                    >
                      <option value="TRIAL">TRIAL</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PREMIUM">PREMIUM</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Branches Limit</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      value={newMaxBranches}
                      onChange={(e) => setNewMaxBranches(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Rooms Limit</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      value={newMaxRooms}
                      onChange={(e) => setNewMaxRooms(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50 text-white"
                >
                  {formSubmitting ? 'Provisioning...' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {isEditOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h3 className="text-lg font-bold text-white">Edit Limits: {selectedOrg.name}</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-sm text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Plan</label>
                  <select
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                  >
                    <option value="TRIAL">TRIAL</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</label>
                  <select
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Branches Limit</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={editMaxBranches}
                    onChange={(e) => setEditMaxBranches(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Rooms Limit</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={editMaxRooms}
                    onChange={(e) => setEditMaxRooms(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50 text-white"
                >
                  {formSubmitting ? 'Updating...' : 'Update Limits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
