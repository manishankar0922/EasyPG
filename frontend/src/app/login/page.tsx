'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, setServerSideCookies } from '@/store/auth-store';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      // Force React to yield to the browser paint cycle immediately
      await new Promise((resolve) => setTimeout(resolve, 10));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api-backend/v1';

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('u9pgs_token', data.token);
      localStorage.setItem('u9pgs_user', JSON.stringify(data.user));
      
      // Ensure cookie is fully written before redirecting!
      await setServerSideCookies(data.token, data.user.role);
      setAuth(data.user, data.token);

      const role = data.user.role;
      if (role === 'SUPERADMIN' || role === 'SUPER_ADMIN') {
        router.replace('/superadmin/dashboard');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(`Cannot reach server or login failed. ${err.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Soft B2B Background */}
      <div className="absolute top-0 w-full h-[400px] bg-gradient-to-b from-blue-600/10 to-transparent"></div>
      
      <div className="w-full max-w-[400px] space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 relative z-10 m-4 sm:m-0 border border-slate-100">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30">
            <span className="text-2xl font-black text-white">U9</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">PG Manager</h1>
          <p className="text-sm text-slate-500 font-medium">Log in to your dashboard</p>
        </div>

        {error && (
          <div className="w-full p-4 rounded-xl bg-red-50 text-red-600 text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white pl-11 pr-5 py-3.5 text-slate-900 placeholder-slate-400 transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
                  placeholder="owner@pg.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white pl-11 pr-5 py-3.5 text-slate-900 placeholder-slate-400 transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/30 disabled:opacity-50 mt-4 shadow-lg shadow-blue-600/20"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Sign In Securely</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
