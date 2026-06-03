'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Shield, User as UserIcon, Mail, Phone, Loader2, Plus } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

interface Profile {
  id: string;
  name: string;
  phone: string | null;
  role: 'OWNER' | 'WARDEN' | 'STAFF';
  createdAt: string;
}

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'STAFF' as 'WARDEN' | 'STAFF',
    password: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/users', formData);
      setSuccess(res.data.message);
      setShowModal(false);
      setFormData({ email: '', name: '', phone: '', role: 'STAFF', password: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const getDefaultPassword = () => {
    if (formData.role === 'WARDEN') return 'warden@123';
    if (formData.role === 'STAFF') return 'staff@123';
    return 'user@123';
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
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500">Manage your organization's staff and wardens.</p>
        </div>
        {currentUser?.role !== 'STAFF' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          {success}
        </div>
      )}

      {/* Users List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-bottom border-slate-200 bg-slate-50">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
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
                    <span className="font-medium text-slate-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    user.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'WARDEN' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role === 'OWNER' && <Shield className="h-3 w-3" />}
                    <span>{user.role}</span>
                  </span>
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
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add New Team Member</h2>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="warden@u9solutions.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {currentUser?.role === 'OWNER' && <option value="WARDEN">Warden</option>}
                  <option value="STAFF">Staff</option>
                </select>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium uppercase mb-1">Default Password</p>
                <code className="text-sm text-blue-900 font-bold">{getDefaultPassword()}</code>
                <p className="text-[10px] text-blue-600 mt-1 italic">
                  * User can change this after logging in.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
