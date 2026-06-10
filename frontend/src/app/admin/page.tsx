'use client';

import Link from 'next/link';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { 
  Building2, Users, LayoutGrid, Plus, ShieldCheck, 
  Settings, LogOut, CheckCircle2, AlertTriangle, KeyRound, Edit, X, Trash2, ChevronDown, KeySquare, PowerOff, Search, UserCheck, Activity
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SystemLog {
  id: string;
  adminId: string;
  action: string;
  details: string;
  targetOrgId: string | null;
  createdAt: string;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'organizations' | 'logs'>('organizations');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Delete State
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    // Enforce Admin Role access
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    fetchOrgs();
  }, [isMounted, user]);

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

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/system-logs');
      if (res.data.success) {
        setSystemLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

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

  const openDeleteModal = (org: Organization) => {
    setSelectedOrg(org);
    setDeleteInput('');
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    if (deleteInput !== `delete ${selectedOrg.name}`) {
      setDeleteError(`Please type exactly "delete ${selectedOrg.name}" to confirm.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await api.delete(`/admin/organizations/${selectedOrg.id}`);
      if (res.data.success) {
        setIsDeleteOpen(false);
        fetchOrgs(); // Refresh list
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Failed to delete organization');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSuspend = async (org: Organization) => {
    try {
      const newStatus = org.subscriptionStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const res = await api.put(`/admin/organizations/${org.id}/subscription`, {
        subscriptionPlan: org.subscriptionPlan,
        subscriptionStatus: newStatus,
        maxBranches: org.maxBranches,
        maxRooms: org.maxRooms
      });
      if (res.data.success) {
        fetchOrgs();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async (email: string | null) => {
    if (!email) {
      alert('This organization owner does not have an email address set.');
      return;
    }
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        alert(`Password reset link sent to ${email}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send password reset');
    }
  };

  const handleImpersonate = async (orgId: string) => {
    try {
      const res = await api.post(`/admin/organizations/${orgId}/impersonate`);
      if (res.data.success && res.data.data.session) {
        // Save the temporary admin token to local storage
        localStorage.setItem('u9-auth-token', res.data.data.session.access_token);
        
        // Let the app reload so Zustand fetches the new user state and redirects to the client dashboard
        window.location.href = '/'; 
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to impersonate owner.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isMounted || (loading && organizations.length === 0)) {
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

  // Filter logic
  const filteredOrganizations = organizations.filter(org => {
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.ownerName.toLowerCase().includes(q) ||
      org.ownerPhone.includes(q) ||
      (org.ownerEmail && org.ownerEmail.toLowerCase().includes(q))
    );
  });

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
        <div className="flex gap-4 border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('organizations')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${activeTab === 'organizations' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Organizations
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${activeTab === 'logs' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Audit Logs
          </button>
        </div>

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

        {activeTab === 'organizations' ? (
          <>
            {/* Organizations Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
              <div className="flex flex-col gap-4 border-b border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Hostel Tenants / Organizations</h2>
              <p className="text-sm text-slate-400">Configure subscription statuses, limit caps, and provision new system tenants.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search owners, emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-slate-700 bg-slate-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <Link
                href="/admin/organisations/new"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 hover:shadow-emerald-500/30 shrink-0"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Add New Owner</span>
              </Link>
            </div>
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
                {filteredOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      {searchQuery ? 'No organizations match your search.' : 'No organizations provisioned yet. Click "Add New Owner" to start.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrganizations.map((org) => (
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-700/50 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-emerald-500">
                              <Settings className="h-3.5 w-3.5" />
                              Manage Org
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-56 p-2 bg-slate-900 border-slate-700 shadow-2xl">
                            <div className="flex flex-col gap-1">
                              <Link
                                href={`/admin/organisations/${org.id}/rooms`}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
                              >
                                <LayoutGrid className="h-4 w-4 text-teal-400" />
                                Manage Rooms
                              </Link>
                              
                              <button 
                                onClick={() => handleImpersonate(org.id)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition text-left"
                              >
                                <UserCheck className="h-4 w-4 text-indigo-400" />
                                Login as Owner
                              </button>

                              <button 
                                onClick={() => openEditModal(org)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition text-left"
                              >
                                <Edit className="h-4 w-4 text-emerald-400" />
                                Subscription Limits
                              </button>

                              <button 
                                onClick={() => handleResetPassword(org.ownerEmail)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition text-left"
                              >
                                <KeySquare className="h-4 w-4 text-blue-400" />
                                Send Password Reset
                              </button>

                              <div className="h-px w-full bg-slate-800 my-1" />

                              <button 
                                onClick={() => handleToggleSuspend(org)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition text-left"
                              >
                                <PowerOff className={`h-4 w-4 ${org.subscriptionStatus === 'ACTIVE' ? 'text-amber-500' : 'text-emerald-500'}`} />
                                {org.subscriptionStatus === 'ACTIVE' ? 'Suspend Organization' : 'Reactivate Organization'}
                              </button>

                              <button 
                                onClick={() => openDeleteModal(org)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-950 hover:text-red-300 transition text-left"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Organization
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">System Audit Logs</h2>
                <p className="text-sm text-slate-400">Track and monitor all administrative actions across the platform.</p>
              </div>
              <button onClick={fetchLogs} className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition">
                <Activity className="h-4 w-4 text-emerald-400" />
                Refresh Logs
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 w-48">Timestamp</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4 w-full">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {systemLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-500">No logs recorded yet.</td>
                    </tr>
                  ) : (
                    systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/30 transition">
                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase border ${
                            log.action.includes('DELETE') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            log.action.includes('UPDATE') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200">{log.details}</div>
                          {log.targetOrgId && <div className="text-xs text-slate-500 mt-1 font-mono">Target Org: {log.targetOrgId}</div>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

      {/* Delete Organization Modal */}
      {isDeleteOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-900/50 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete Organization
              </h3>
              <button onClick={() => setIsDeleteOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-sm text-slate-300">
                This action is <strong>permanent and irreversible</strong>. It will delete the organization <span className="font-bold text-white">{selectedOrg.name}</span> and all associated:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 ml-2">
                <li>Owner & Staff Profiles</li>
                <li>Branches, Rooms & Beds</li>
                <li>Tenants & Admissions</li>
                <li>Invoices & Payments</li>
              </ul>
              <p className="text-sm text-slate-300 mt-4">
                To confirm, please type exactly <br/>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded select-all mt-2 inline-block">delete {selectedOrg.name}</span>
              </p>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-sm text-red-400">
                {deleteError}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder={`delete ${selectedOrg.name}`}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-white placeholder-slate-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono text-sm"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                autoComplete="off"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || deleteInput !== `delete ${selectedOrg.name}`}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
