'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // New Tab & OTP Feature States
  const [loginTab, setLoginTab] = useState<'client' | 'dev'>('client');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('otp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const res = await api.post('/auth/reset-password', { email: resetEmail, newPassword });
      if (res.data.success) {
        alert('Password reset successfully. You can now login.');
        setShowResetModal(false);
        setResetEmail('');
        setNewPassword('');
      } else {
        alert(res.data.error || 'Failed to reset password');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      // apiUrl already includes /api/v1, so we just append /auth/login
      const endpoint = apiUrl.endsWith('/api/v1') ? '/auth/login' : '/api/v1/auth/login';

      const response = await fetch(
        `${apiUrl}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Save token
      localStorage.setItem('easypg_token', data.token);
      localStorage.setItem('easypg_user', JSON.stringify(data.user));
      setAuth(data.user, data.token); // Keep Zustand store in sync

      // Redirect based on role
      const role = data.user.role;

      if (role === 'SUPERADMIN' || role === 'SUPER_ADMIN') {
        router.push('/superadmin/dashboard');
      } else if (role === 'OWNER') {
        router.push('/dashboard');
      } else if (role === 'WARDEN') {
        router.push('/dashboard');
      } else {
        setError('Unknown role. Contact admin.');
      }

    } catch (err: any) {
      console.error('Login error:', err);

      if (err.message && err.message.includes('fetch')) {
        setError(
          'Cannot reach server. Check if backend is running.'
        );
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mock OTP Handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call for sending OTP
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      alert(`Dummy OTP sent to ${phoneNumber}. This is a UI placeholder.`);
    }, 1000);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call for verifying OTP
    setTimeout(() => {
      setLoading(false);
      alert('Dummy OTP Verified successfully! (API integration pending)');
      // Reset for now since it's dummy
      setOtpSent(false);
      setOtpCode('');
      setPhoneNumber('');
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Gradients & Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
      <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full bg-violet-600/10 blur-[100px]"></div>

      <div className="w-full max-w-md space-y-8 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-10 shadow-2xl relative z-10">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
            <span className="text-2xl font-black text-white">U9</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">U9 Solutions</h1>
          <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">Hostel Operations Intelligence</p>
        </div>

        {/* Tabs for Client vs Dev */}
        <div className="flex border-b border-slate-700 mb-6 mt-6">
          <button
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${loginTab === 'client' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            onClick={() => { setLoginTab('client'); setLoginMethod('otp'); }}
          >
            Tenant Login
          </button>
          <button
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${loginTab === 'dev' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            onClick={() => { setLoginTab('dev'); setLoginMethod('password'); }}
          >
            Staff / Dev Login
          </button>
        </div>

        {/* Toggle Login Method */}
        <div className="flex gap-2 mb-6">
          <button
             type="button"
             className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${loginMethod === 'otp' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             onClick={() => setLoginMethod('otp')}
          >
            Login via OTP
          </button>
          <button
             type="button"
             className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${loginMethod === 'password' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             onClick={() => setLoginMethod('password')}
          >
            Login via Password
          </button>
        </div>

        {error && (
          <div className="w-full p-4 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm text-center mt-4">
            {error === 'Invalid email or password'
              ? '❌ Wrong email or password'
              : error === 'Account deactivated. Contact admin.'
                ? '🚫 Account deactivated'
                : error.includes('Cannot reach server')
                  ? '🌐 Server not reachable. Check connection.'
                  : `❌ ${error}`
            }
          </div>
        )}

        {loginMethod === 'password' ? (
          <form className="mt-4 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="block w-full rounded-2xl border-2 border-white/10 bg-white/5 px-5 py-4 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setShowResetModal(true)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-2xl border-2 border-white/10 bg-white/5 px-5 py-4 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 text-sm font-black tracking-wide text-white transition-all hover:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 overflow-hidden shadow-xl shadow-blue-900/20 mt-2"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              {loading ? <Loader2 className="relative z-10 mr-2 h-5 w-5 animate-spin" /> : <span className="relative z-10">Sign In Securely</span>}
            </button>
          </form>
        ) : (
          <form className="mt-4 space-y-6" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            {!otpSent ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    className="block w-full rounded-2xl border-2 border-white/10 bg-white/5 px-5 py-4 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
                    placeholder="+91 9999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-2xl border-2 border-white/10 bg-white/5 px-5 py-4 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner tracking-[0.5em] text-center text-lg font-mono"
                    placeholder="••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                  />
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 text-sm font-black tracking-wide text-white transition-all hover:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 overflow-hidden shadow-xl shadow-blue-900/20 mt-2"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              {loading ? <Loader2 className="relative z-10 mr-2 h-5 w-5 animate-spin" /> : <span className="relative z-10">{otpSent ? 'Verify & Login' : 'Send OTP'}</span>}
            </button>
            
            {otpSent && (
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setOtpSent(false)}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Change Phone Number
                </button>
              </div>
            )}
          </form>
        )}

      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
            <p className="text-slate-400 text-sm mb-6">Enter your email and a new password to reset your account.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:bg-slate-800 focus:outline-none"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:bg-slate-800 focus:outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetPassword}
                disabled={resetting || !resetEmail || !newPassword}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {resetting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

