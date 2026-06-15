'use client';

import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function SuccessAnimation({ message }: { message?: string }) {
  const { lang } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in zoom-in duration-300">
      <div className="relative w-24 h-24 flex items-center justify-center mb-4">
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        
        {/* Inner solid circle */}
        <div className="relative z-10 w-20 h-20 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center transform hover:scale-105 transition-transform">
          <Check className="h-10 w-10 text-white animate-[drawCheck_0.5s_ease-out_forwards]" strokeWidth={4} />
        </div>
      </div>
      
      <h3 className="text-xl font-black text-slate-900 tracking-tight">
        {message || (lang === 'te' ? 'విజయవంతం!' : 'Success!')}
      </h3>
    </div>
  );
}
