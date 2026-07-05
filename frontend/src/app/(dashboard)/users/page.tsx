'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, User as UserIcon, Mail, Phone, Loader2, Plus, MoreVertical, Key, Ban, CheckCircle, Building, AlertCircle, Copy, MessageCircle, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/context/LanguageContext';

interface Branch {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'OWNER' | 'WARDEN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  branchId: string | null;
  branch?: Branch | null;
  createdAt: string;
}

// Random, readable temp password (e.g. "W9ard-3kfx") — shown once, then only
// resettable. Never a guessable default like warden@123.
const genTempPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `W${s.slice(0, 4)}-${s.slice(4)}`;
};

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const { t } = useLanguage();
  const isOwner = currentUser?.role === 'OWNER';
  const [users, setUsers] = useState<Profile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State — owners create WARDEN logins only
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    branchId: ''
  });

  // Credentials of the login that was just created — shown ONCE for sharing
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/users'),
        api.get('/branches')
      ]);
      setUsers(usersRes.data.data);
      setBranches(branchesRes.data.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      await api.patch(`/users/${userId}/status`, { status });
      setSuccess(`User status updated to ${status}`);
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
    setActiveMenu(null);
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password (min 6 chars):');
    if (!newPassword || newPassword.length < 6) return;

    try {
      await api.post(`/users/${userId}/reset-password`, { newPassword });
      setSuccess('Password reset successful');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
    setActiveMenu(null);
  };

  const handleChangeBranch = async (userId: string, branchId: string | null) => {
    try {
      await api.patch(`/users/${userId}/assign-branch`, { branchId });
      setSuccess('Branch assignment updated');
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
    setActiveMenu(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Generate the temp password client-side so we can show it to the owner
    // exactly once — the API never echoes passwords back.
    const tempPassword = genTempPassword();

    try {
      await api.post('/users', {
        ...formData,
        role: 'WARDEN',
        password: tempPassword,
        branchId: formData.branchId || null
      });
      setShowModal(false);
      setCreatedCreds({ name: formData.name, email: formData.email, password: tempPassword });
      setCopiedCreds(false);
      setFormData({ email: '', name: '', phone: '', branchId: '' });
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const credsText = createdCreds
    ? `U9PGs Warden Login\nName: ${createdCreds.name}\nEmail: ${createdCreds.email}\n${t.tempPassword}: ${createdCreds.password}`
    : '';

  const copyCreds = async () => {
    try {
      await navigator.clipboard.writeText(credsText);
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.staffTitle}</h1>
          <p className="text-slate-500">{t.staffSubtitle}</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            <span>{t.addWarden}</span>
          </button>
        )}
      </div>

      {success && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Users List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-bottom border-slate-200 bg-slate-50">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Role & Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block font-medium text-slate-900">{user.name}</span>
                      <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1.5">
                    <span className={`inline-flex w-fit items-center space-x-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'WARDEN' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role === 'OWNER' && <Shield className="h-3 w-3" />}
                      <span>{user.role}</span>
                    </span>
                    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      user.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-sm text-slate-600">
                    <Building className="mr-2 h-4 w-4 text-slate-400" />
                    {user.branch?.name || 'Unassigned'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {user.phone && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Phone className="mr-2 h-3 w-3" />
                        {user.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right relative">
                  {currentUser?.role === 'OWNER' && user.id !== currentUser.id && (
                    <div className="inline-block">
                      <button
                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                        aria-label={`Actions for ${user.name}`}
                        aria-expanded={activeMenu === user.id}
                        className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <MoreVertical className="h-5 w-5 mx-auto" />
                      </button>

                      {activeMenu === user.id && (
                        <div className="absolute right-6 top-12 z-10 w-48 rounded-lg bg-white p-1 shadow-xl border border-slate-200">
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Key className="h-4 w-4" />
                            <span>Reset Password</span>
                          </button>
                          
                          {user.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(user.id, 'SUSPENDED')}
                              className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Ban className="h-4 w-4" />
                              <span>Suspend User</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(user.id, 'ACTIVE')}
                              className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Activate User</span>
                            </button>
                          )}

                          <div className="my-1 border-t border-slate-100"></div>
                          <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Branch</p>
                          {branches.map(b => (
                            <button
                              key={b.id}
                              onClick={() => handleChangeBranch(user.id, b.id)}
                              className={`flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm ${
                                user.branchId === b.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <Building className="h-4 w-4" />
                              <span className="truncate">{b.name}</span>
                            </button>
                          ))}
                          <button
                            onClick={() => handleChangeBranch(user.id, null)}
                            className={`flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm ${
                              !user.branchId ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Building className="h-4 w-4" />
                            <span>Unassign</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add Team Member</h2>
                <p className="text-xs text-slate-500 mt-0.5">Invite a new staff member or warden to your organization.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="min-h-[44px] min-w-[44px] rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5 mx-auto" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Role</label>
                  <div className="flex h-[46px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-bold text-slate-700">Warden</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Branch Assignment</label>
                  <div className="relative group">
                    <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <select
                      required
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                      <option value="">Select branch…</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {branches.length === 0 && (
                <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">No Branches Found</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      A warden must be assigned to a branch. Ask your administrator to add a branch first.
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Initial Credentials</p>
                  <Shield className="h-4 w-4 text-blue-300" />
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  A secure temporary password will be generated and shown once after creation — copy or WhatsApp it to the warden.
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100 text-sm text-red-600 font-medium text-center">
                  {error}
                </div>
              )}
            </form>

            <div className="flex items-center space-x-3 border-t border-slate-100 bg-slate-50/50 px-8 py-5 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  const form = target.closest('div')?.previousElementSibling as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}

                disabled={submitting}
                className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : 'Confirm & Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created credentials — shown exactly once */}
      {createdCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-label={t.wardenCreated} className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in zoom-in duration-200">
            <button
              onClick={() => setCreatedCreds(null)}
              aria-label="Close"
              className="absolute right-3 top-3 min-h-[44px] min-w-[44px] rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5 mx-auto" />
            </button>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-center text-xl font-bold text-slate-900">{t.wardenCreated}</h2>
            <p className="mt-1 text-center text-sm text-slate-500">{t.sharePassword}</p>

            <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">Name</span>
                <span className="text-sm font-bold text-slate-900">{createdCreds.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">Email</span>
                <span className="truncate text-sm font-bold text-slate-900">{createdCreds.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">{t.tempPassword}</span>
                <code className="rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-bold tracking-wide text-white">
                  {createdCreds.password}
                </code>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={copyCreds}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <Copy className="h-4 w-4" />
                {copiedCreds ? t.copied : t.copyDetails}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(credsText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition"
              >
                <MessageCircle className="h-4 w-4" />
                {t.shareWhatsApp}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
