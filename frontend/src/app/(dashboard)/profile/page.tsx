'use client';

import { useAuthStore } from '@/store/auth-store';
import { useTranslation } from '@/hooks/useTranslation';
import { LogOut, User, Building2, Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { t, lang, setLang } = useTranslation();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white px-5 pt-6 pb-6 shadow-sm mb-6 rounded-b-3xl text-center">
        <div className="h-24 w-24 rounded-full bg-slate-100 mx-auto mb-4 border-4 border-slate-50 shadow-md flex items-center justify-center overflow-hidden">
          {user?.avatar ? (
            <Image src={user.avatar} alt="Avatar" fill className="object-cover" />
          ) : (
            <span className="text-3xl font-black text-slate-300">
              {user?.name?.substring(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-black text-slate-900 leading-tight">{user?.name || 'Owner'}</h1>
        <p className="text-sm font-semibold text-slate-500">{user?.role === 'SUPER_ADMIN' ? 'System Administrator' : 'Hostel Owner'}</p>
      </div>

      <div className="px-4 space-y-6">
        {/* Language Selection Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">App Language</h2>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setLang('en')}
              className={cn(
                "flex-1 h-14 rounded-2xl font-black transition-all border-2",
                lang === 'en' 
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30" 
                  : "bg-white text-slate-500 border-slate-200 active:bg-slate-50"
              )}
            >
              English
            </button>
            <button
              onClick={() => setLang('te')}
              className={cn(
                "flex-1 h-14 rounded-2xl font-black transition-all border-2 text-lg",
                lang === 'te' 
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30" 
                  : "bg-white text-slate-500 border-slate-200 active:bg-slate-50"
              )}
            >
              తెలుగు
            </button>
          </div>
          <p className="text-xs text-center font-medium text-slate-400 mt-4">
            Changes will be applied immediately across the app.
          </p>
        </div>

        {/* Hostel Details Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-indigo-500" />
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Business Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Branch</span>
              <span className="font-bold text-slate-900">{user?.branchName || 'Main Branch'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Phone</span>
              <span className="font-bold text-slate-900">{user?.phone || '+91 XXXX XXXX'}</span>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full h-14 bg-rose-50 text-rose-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:bg-rose-100 transition-colors border border-rose-100"
        >
          <LogOut className="h-5 w-5" />
          Logout Safely
        </button>
      </div>
    </div>
  );
}
