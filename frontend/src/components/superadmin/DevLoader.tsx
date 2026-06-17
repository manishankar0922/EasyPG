'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DevLoaderProps {
  message?: string;
  className?: string;
}

const BOOT_LOGS = [
  '$ u9pgs-cli init --env=production',
  '🚀 Initializing kernel handshake...',
  '🔑 Decrypting cryptographic JWT secrets... done',
  '🗄️ Connecting to pg_pooler... active',
  '📲 Spawning background BullMQ workers... online',
  '🧬 Mounting administrative command center...'
];

export default function DevLoader({ message = 'Loading developer view...', className }: DevLoaderProps) {
  const [show, setShow] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setShow(true);
    }, 100);

    return () => clearTimeout(delayDebounce);
  }, []);

  useEffect(() => {
    if (!show) return;
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < BOOT_LOGS.length) {
        const nextLog = BOOT_LOGS[currentIdx];
        setLogs(prev => [...prev, nextLog]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 overflow-hidden font-mono px-4">
      {/* Premium Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Cyber Center Spinner */}
      <div className="relative flex flex-col items-center z-10 gap-6">
        <div className="relative flex items-center justify-center h-20 w-20">
          {/* Animated Neon Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full border-2 border-violet-500/20 border-b-violet-500 animate-spin" style={{ animationDuration: '1s', animationDirection: 'reverse' }} />
          <div className="absolute inset-4 rounded-full border-2 border-cyan-500/10 border-t-cyan-500 animate-pulse" />
          
          {/* Glow center */}
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white text-xs font-black select-none">EP</span>
          </div>
        </div>

        {/* Loading Message */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 animate-pulse">
            {message}
          </p>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            Security Clearance Level 4
          </span>
        </div>

        {/* Mock Developer Terminal logs */}
        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl select-none">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-[10px] text-slate-500 font-bold ml-2">u9pgs@admin-cli</span>
          </div>
          <div className="space-y-1.5 min-h-[90px]">
            {logs.map((log, i) => (
              <p
                key={i}
                className={`text-[11px] leading-relaxed transition-all duration-300 ${
                  i === 0 
                    ? 'text-cyan-400 font-bold' 
                    : log?.includes('done') || log?.includes('active') || log?.includes('online')
                      ? 'text-emerald-400' 
                      : 'text-slate-400'
                }`}
              >
                {log}
              </p>
            ))}
            {logs.length < BOOT_LOGS.length && (
              <div className="h-4 w-1 bg-cyan-400 animate-pulse mt-0.5 inline-block" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xs h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 rounded-full animate-loading-bar" style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  );
}
