'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, setServerSideCookies } from '@/store/auth-store';
import { Loader2, Terminal } from 'lucide-react';

export default function DevLogin() {
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
      // This instantly shows the loading spinner and fixes the 10-second INP render block
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

      router.push('/superadmin/dashboard');
    } catch (err: any) {
      setError('System offline. Console connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] relative overflow-hidden font-mono">
      {/* Hacker Console Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0a] to-[#0a0a0a]"></div>
      
      <div className="w-full max-w-md space-y-8 bg-black/80 p-10 rounded-xl border border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.15)] relative z-10 m-4 sm:m-0 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-8">
          <Terminal className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">U9_Console</h1>
            <p className="text-xs text-indigo-500/70 tracking-widest">SysAdmin Auth Required</p>
          </div>
        </div>

        {error && (
          <div className="w-full p-4 bg-red-950/30 border border-red-500/50 text-red-500 text-xs tracking-wider">
            [ERR] {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-2">root@email ~#</label>
              <input
                type="email"
                required
                className="block w-full bg-transparent border-b border-indigo-500/30 py-2 text-white placeholder-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="admin@u9pgs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-2">key.pass ~#</label>
              <input
                type="password"
                required
                className="block w-full bg-transparent border-b border-indigo-500/30 py-2 text-white placeholder-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-indigo-600/10 border border-indigo-500/50 px-4 py-4 text-xs font-bold text-indigo-400 uppercase tracking-widest transition-all hover:bg-indigo-500/20 hover:text-indigo-300 focus:outline-none disabled:opacity-50 mt-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>[ Execute Auth ]</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
