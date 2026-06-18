'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, Phone, ShieldCheck, ArrowRight, Home } from 'lucide-react';

export default function TenantLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const endpoint = apiUrl.endsWith('/api/v1') ? '/tenant-auth/login' : '/api/v1/tenant-auth/login';

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber.trim(), password: tenantPassword.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('u9pgs_token', data.token);
      localStorage.setItem('u9pgs_user', JSON.stringify(data.user));
      setAuth(data.user, data.token);

      router.push('/dashboard'); 
    } catch (err: any) {
      if (err.message && err.message.includes('fetch')) {
        setError('Cannot reach server. Check your internet connection.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/20 blur-[150px] animate-pulse" style={{ animationDuration: '10s' }}></div>
      <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px]"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      <div className="w-full max-w-[420px] p-8 relative z-10 m-4 sm:m-0">
        
        {/* Glassmorphic Container */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-[2.5rem] p-8 shadow-2xl shadow-black/50 overflow-hidden relative">
          
          {/* Shine effect */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)] ring-1 ring-white/20">
              <Home className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Tenant Portal</h1>
            <p className="text-sm text-slate-400 font-medium">Manage rent, complaints & your stay.</p>
          </div>

          {error && (
            <div className="w-full p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center font-medium flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-400">
                  <Phone className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="tel"
                  required
                  className="block w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-5 py-4 text-white placeholder-slate-500 transition-all focus:border-indigo-500/50 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-white/20"
                  placeholder="Registered Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  maxLength={4}
                  className="block w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-5 py-4 text-white placeholder-slate-500 transition-all focus:border-indigo-500/50 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-white/20 tracking-widest"
                  placeholder="Aadhaar Last 4 (or Phone Last 4)"
                  value={tenantPassword}
                  onChange={(e) => setTenantPassword(e.target.value)}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-bold tracking-wide text-black transition-all hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:opacity-50 mt-8"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-xs text-slate-500">
              Secured by <span className="font-semibold text-slate-300">U9PGs Enterprise</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
