'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, Phone, Shield } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center bg-teal-950 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-400/20 blur-[100px]"></div>

      <div className="w-full max-w-sm space-y-8 p-8 relative z-10 m-4 sm:m-0">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(52,211,153,0.4)]">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Tenant Portal</h1>
          <p className="text-sm text-teal-200/70 font-medium">Log in to view your rent & complaints</p>
        </div>

        {error && (
          <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium backdrop-blur-md">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-teal-400/50" />
              </div>
              <input
                type="tel"
                required
                className="block w-full rounded-2xl border-2 border-transparent bg-white/5 pl-12 pr-5 py-4 text-white placeholder-teal-400/30 transition-all focus:border-emerald-500 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Shield className="h-5 w-5 text-teal-400/50" />
              </div>
              <input
                type="password"
                required
                maxLength={4}
                className="block w-full rounded-2xl border-2 border-transparent bg-white/5 pl-12 pr-5 py-4 text-white placeholder-teal-400/30 transition-all focus:border-emerald-500 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                placeholder="Aadhaar Last 4 Digits"
                value={tenantPassword}
                onChange={(e) => setTenantPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-black tracking-wide text-white transition-all hover:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Access My Portal</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
