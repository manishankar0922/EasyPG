'use client';

import { Search, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function SearchingAnimation({ message }: { message?: string }) {
  const { t, lang } = useLanguage();
  
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-48 h-32 flex items-center justify-center mb-6">
        
        {/* Left Profile Card */}
        <div className="absolute left-0 w-16 h-20 bg-slate-100 rounded-xl border border-slate-200 opacity-50 transform -translate-y-2 translate-x-2 -rotate-6 flex flex-col items-center p-2">
          <div className="w-6 h-6 rounded-full bg-slate-300 mb-2"></div>
          <div className="w-10 h-1.5 bg-slate-300 rounded-full mb-1"></div>
          <div className="w-8 h-1 bg-slate-200 rounded-full"></div>
        </div>

        {/* Right Profile Card */}
        <div className="absolute right-0 w-16 h-20 bg-slate-100 rounded-xl border border-slate-200 opacity-50 transform -translate-y-2 -translate-x-2 rotate-6 flex flex-col items-center p-2">
          <div className="w-6 h-6 rounded-full bg-slate-300 mb-2"></div>
          <div className="w-10 h-1.5 bg-slate-300 rounded-full mb-1"></div>
          <div className="w-8 h-1 bg-slate-200 rounded-full"></div>
        </div>

        {/* Center Profile Card */}
        <div className="z-10 w-24 h-32 bg-blue-50 rounded-xl border-2 border-blue-100 shadow-sm flex flex-col items-center p-3 relative overflow-hidden">
          {/* Scanning Line overlay */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-[scan_1.5s_ease-in-out_infinite_alternate]"></div>
          
          <div className="w-12 h-12 rounded-full bg-blue-200 mb-3 flex items-center justify-center text-blue-600">
            <User className="h-6 w-6" />
          </div>
          <div className="w-16 h-2 bg-blue-200 rounded-full mb-2"></div>
          <div className="w-12 h-1.5 bg-blue-100 rounded-full"></div>
        </div>

        {/* Magnifying Glass (Bouncing/Searching) */}
        <div className="absolute z-20 text-blue-600 animate-[searchBounce_2s_ease-in-out_infinite]">
          <div className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-blue-100">
            <Search className="h-8 w-8" />
          </div>
        </div>
      </div>
      
      <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest animate-pulse">
        {message || t.searching}
      </h3>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(120px); }
        }
        @keyframes searchBounce {
          0% { transform: translate(-30px, 10px) scale(0.9); }
          50% { transform: translate(30px, -10px) scale(1.1); }
          100% { transform: translate(-30px, 10px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
