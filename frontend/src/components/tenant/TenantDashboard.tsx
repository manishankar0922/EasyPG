import { useAuthStore } from '@/store/auth-store';
import { IndianRupee, Bell, FileText, Wrench, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function TenantDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<{
    pendingRent: number;
    roomDetails: any;
    notices: any[];
  } | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/tenant-portal/dashboard');
        if (res.data.success) {
          setDashboardData(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      }
    };
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 font-sans selection:bg-emerald-500/30 text-slate-200">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="px-6 py-8 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-emerald-400 tracking-widest uppercase mb-1">Welcome Back</h2>
            <h1 className="text-3xl font-black text-white">{user?.name || 'Tenant'}</h1>
          </div>
          <button onClick={handleLogout} className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-95 transition-all text-slate-400 hover:text-white">
            <LogOut size={20} />
          </button>
        </div>

        <div className="px-6 space-y-6">
          {/* Main Balance Card (Glassmorphism) */}
          <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <p className="text-sm font-semibold text-slate-400 mb-1">Total Outstanding Dues</p>
                <div className="flex items-baseline gap-1 text-emerald-400">
                  <span className="text-2xl font-bold">₹</span>
                  <span className="text-5xl font-black tracking-tight text-white">{dashboardData ? dashboardData.pendingRent.toLocaleString('en-IN') : '...'}</span>
                </div>
              </div>
              <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                Due: 5th
              </div>
            </div>

            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative z-10">Pay Now Securely</span>
            </button>
          </div>

          {/* Quick Actions Grid */}
          <h3 className="text-lg font-bold text-white px-1 pt-2">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl active:scale-95 transition-transform backdrop-blur-md">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
                <FileText size={24} />
              </div>
              <h4 className="font-bold text-white text-lg">My Rent<br/>Receipts</h4>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl active:scale-95 transition-transform backdrop-blur-md">
              <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-4 text-orange-400">
                <Wrench size={24} />
              </div>
              <h4 className="font-bold text-white text-lg">Raise<br/>Complaint</h4>
            </div>

          </div>

          {/* Notice Board */}
          <h3 className="text-lg font-bold text-white px-1 pt-4">Notice Board</h3>
          {dashboardData?.notices && dashboardData.notices.length > 0 ? (
            dashboardData.notices.map((notice, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md mb-4">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-400 mt-1">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{notice.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {notice.message}
                    </p>
                    <p className="text-xs font-bold text-slate-500 mt-3 uppercase tracking-wider">
                      {new Date(notice.sentAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md text-center text-slate-400">
              No new notices from the Warden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
