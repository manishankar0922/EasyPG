'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, setServerSideCookies } from '@/store/auth-store';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [identifier, setIdentifier] = useState('');
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

      const isPhone = /^[0-9\+\-\s]+$/.test(identifier) && identifier.replace(/\D/g, '').length >= 10;
      // Heuristic: Tenant PINs are usually 4 digits. If it's a number and password is short, assume tenant.
      const isTenant = isPhone && password.trim().length <= 10 && /^\d+$/.test(password.trim());

      const endpoint = isTenant ? '/tenant-auth/login' : '/auth/login';
      const payload = isTenant
        ? { phone: identifier.trim(), password: password.trim() }
        : { identifier: identifier.trim().toLowerCase(), password };

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] relative overflow-hidden font-sans selection:bg-slate-900 selection:text-white">
      {/* Premium Cinematic Background Elements */}
      <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-slate-200/50 to-transparent"></div>
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-400/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-[420px] space-y-8 bg-white/80 backdrop-blur-xl p-10 sm:p-12 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative z-10 border border-white/60 mx-4">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center mb-8 shadow-2xl shadow-slate-900/20">
            <span className="text-2xl font-bold tracking-tight text-white">U9</span>
          </div>
          <h1 className="text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight mb-2">Welcome back</h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">Enter your credentials to access the workspace.</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 w-full p-4 rounded-2xl border border-red-200 bg-red-50/50 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="leading-snug">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-5">
            <div className="group">
              <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-slate-400 mb-2.5 transition-colors group-focus-within:text-slate-900">Email or Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-slate-900" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 pl-12 pr-5 py-4 text-slate-900 font-medium placeholder-slate-400 transition-all hover:bg-white focus:bg-white focus:border-slate-900 focus:ring-0 focus:outline-none [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#ffffff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a]"
                  placeholder="name@company.com or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div className="group">
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-slate-400 transition-colors group-focus-within:text-slate-900">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-slate-900" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 pl-12 pr-5 py-4 text-slate-900 font-medium placeholder-slate-400 transition-all hover:bg-white focus:bg-white focus:border-slate-900 focus:ring-0 focus:outline-none [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#ffffff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a]"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-4 text-[0.95rem] font-bold text-white transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none mt-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Sign In Securely</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
