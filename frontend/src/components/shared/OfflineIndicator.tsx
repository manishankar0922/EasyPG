'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center transform animate-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Background danger glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-500/20 blur-3xl rounded-full"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-rose-50 flex items-center justify-center mb-6 border-8 border-white shadow-sm relative">
            <div className="absolute inset-0 rounded-full border-2 border-rose-200 animate-ping"></div>
            <WifiOff className="h-8 w-8 text-rose-500" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
            {lang === 'te' ? 'ఇంటర్నెట్ లేదు' : 'No Internet'}
          </h2>
          
          <p className="text-slate-500 font-medium mb-8 text-sm">
            {lang === 'te' 
              ? 'దయచేసి మీ నెట్‌వర్క్ కనెక్షన్‌ని తనిఖీ చేయండి. మీరు ఆన్‌లైన్‌కి వచ్చిన వెంటనే మేము కనెక్ట్ చేస్తాము.' 
              : 'Please check your network connection. We will automatically reconnect you once you are back online.'}
          </p>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-full border border-slate-100">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {lang === 'te' ? 'కనెక్షన్ కోసం వేచి ఉంది...' : 'Waiting for connection...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
