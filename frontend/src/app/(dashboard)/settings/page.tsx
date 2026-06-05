'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, ShieldCheck, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setProfile(res.data.data);
        }
      } catch (err: any) {
        setError('Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        newPassword: passwordData.newPassword,
      });

      if (res.data.success) {
        setPasswordSuccess(res.data.message || 'Password updated successfully!');
        setPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(res.data.error || 'Failed to update password');
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">Profile Information</h2>
        </div>
        
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {profile && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
              <p className="mt-1 text-base font-semibold text-slate-800">{profile.name}</p>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <p className="mt-1 text-base font-semibold text-slate-800">{profile.email || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</label>
              <p className="mt-1 text-base font-semibold text-slate-800">{profile.phone || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Access Role</label>
              <span className="mt-2 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {profile.role}
              </span>
            </div>

            {profile.organization && (
              <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization / Tenant</label>
                <p className="mt-1 text-base font-bold text-slate-800">{profile.organization.name}</p>
                <p className="text-xs text-slate-500">Plan: {profile.organization.subscriptionPlan} • Status: {profile.organization.subscriptionStatus}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <KeyRound className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="mt-6 space-y-4 max-w-md">
          {passwordError && (
            <div className="flex items-start space-x-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-start space-x-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-600">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Min. 6 characters"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Confirm new password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {passwordLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
