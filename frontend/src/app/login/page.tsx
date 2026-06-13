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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      // Log what we're calling
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log('Calling:', `${apiUrl}/api/auth/login`);
      console.log('Email:', email);

      const response = await fetch(
        `${apiUrl}/api/auth/login`,
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

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

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

        <form className="mt-10 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="w-full p-4 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm text-center">
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

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
              <input
                type="email"
                required
                className="block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <input
                type="password"
                required
                className="block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            {loading ? <Loader2 className="relative z-10 mr-2 h-5 w-5 animate-spin" /> : <span className="relative z-10">Sign In Securely</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
