'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Image from 'next/image';
import { Search, History, CheckCircle2, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuickPaymentPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Payment flow state
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch tenants for search
  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await api.get('/tenants', {
          params: { search: searchQuery, branchId: user?.branchId || '' }
        });
        if (res.data.success) {
          setTenants(res.data.data);
        }
      } catch (err) {
        console.error('Failed to search tenants', err);
      }
    }
    const timer = setTimeout(() => {
      fetchTenants();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, user, activeTab]);

  // Fetch history
  useEffect(() => {
    async function fetchHistory() {
      if (activeTab !== 'HISTORY') return;
      try {
        const res = await api.get('/payments', {
          params: { month: 'current', branchId: user?.branchId || '' }
        });
        if (res.data.success) {
          setHistory(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch history', err);
      }
    }
    fetchHistory();
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'RECORD' && !selectedTenant && !success) {
      searchInputRef.current?.focus();
    }
  }, [activeTab, selectedTenant, success]);

  const handleSelectTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setPaymentAmount(tenant.rentPending > 0 ? tenant.rentPending.toString() : '');
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return;
    
    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        tenantId: selectedTenant.id,
        amount: Number(paymentAmount),
        mode: paymentMode,
        date: new Date().toISOString(),
      });

      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Payment failed', err);
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordAnother = () => {
    setSuccess(false);
    setSelectedTenant(null);
    setSearchQuery('');
    setPaymentAmount('');
    setPaymentMode('CASH');
  };

  const totalCollectedThisMonth = history.reduce((acc, p) => acc + Number(p.amount), 0);

  const paymentModes = [
    { id: 'CASH', label: '💵 Cash' },
    { id: 'PHONEPE', label: '📱 PhonePe' },
    { id: 'GPAY', label: '📱 GPay' },
    { id: 'BANK_TRANSFER', label: '🏦 Bank' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex flex-col">
      {/* Top Toggle Bar */}
      <div className="bg-white px-5 pt-6 pb-4 sticky top-0 z-10 shadow-sm border-b border-slate-100">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => { setActiveTab('RECORD'); setSuccess(false); setSelectedTenant(null); }}
            className={cn("flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all", activeTab === 'RECORD' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
          >
            <IndianRupee className="h-4 w-4 mr-2" />
            Record
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={cn("flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all", activeTab === 'HISTORY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </button>
        </div>
      </div>

      {activeTab === 'RECORD' && !selectedTenant && !success && (
        <div className="p-4 flex-1 flex flex-col">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tenant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-16 bg-white border border-slate-200 rounded-3xl pl-14 pr-4 text-xl font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/20 shadow-sm transition-all outline-none"
            />
          </div>

          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
            {tenants.map(tenant => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant)}
                className="w-full flex items-center justify-between p-4 min-h-[64px] active:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 overflow-hidden relative flex-shrink-0">
                    {tenant.photoUrl ? (
                      <Image src={tenant.photoUrl} alt={tenant.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400 font-bold text-lg">
                        {tenant.name.substring(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900 leading-tight">{tenant.name}</p>
                    <p className="text-sm font-semibold text-slate-500">Room {tenant.roomNumber}</p>
                  </div>
                </div>
                
                {tenant.rentPending > 0 ? (
                  <div className="text-right">
                    <p className="font-black text-rose-600">₹{tenant.rentPending}</p>
                    <p className="text-[10px] font-bold text-rose-400 uppercase">Due</p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="font-black text-emerald-600">Paid ✅</p>
                  </div>
                )}
              </button>
            ))}

            {tenants.length === 0 && searchQuery && (
              <div className="p-8 text-center text-slate-500 font-bold">
                No tenants found for "{searchQuery}"
              </div>
            )}
            {tenants.length === 0 && !searchQuery && (
              <div className="p-8 text-center text-slate-400 font-medium">
                Type a name to search...
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'RECORD' && selectedTenant && !success && (
        <div className="p-4 flex-1 flex flex-col justify-center animate-in slide-in-from-right-4">
          <button 
            onClick={() => setSelectedTenant(null)}
            className="self-center bg-white border border-slate-200 px-6 py-2 rounded-full font-bold text-slate-600 shadow-sm active:scale-95 transition-transform flex items-center gap-2 mb-8"
          >
            <div className="h-6 w-6 rounded-full bg-slate-100 overflow-hidden relative">
              {selectedTenant.photoUrl ? (
                <Image src={selectedTenant.photoUrl} alt="T" fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-500">
                  {selectedTenant.name.substring(0, 1)}
                </div>
              )}
            </div>
            {selectedTenant.name} <span className="text-slate-400 font-normal">· Change</span>
          </button>

          <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8">
            <label className="block text-center text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Amount to Collect</label>
            <div className="flex items-center justify-center text-slate-900 mb-8">
              <span className="text-4xl font-black mr-1 pb-1">₹</span>
              <input 
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                autoFocus
                className="w-[200px] text-5xl font-black text-center bg-transparent border-b-4 border-slate-100 focus:border-blue-600 transition-colors outline-none pb-2"
              />
            </div>

            <label className="block text-center text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Payment Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {paymentModes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setPaymentMode(mode.id)}
                  className={cn(
                    "h-14 rounded-2xl font-bold text-sm transition-all border-2",
                    paymentMode === mode.id 
                      ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20" 
                      : "bg-white text-slate-600 border-slate-100 active:bg-slate-50"
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleRecordPayment}
            disabled={submitting || !paymentAmount}
            className="w-full h-16 bg-emerald-600 text-white rounded-3xl font-black text-xl active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 disabled:opacity-50 disabled:active:scale-100"
          >
            {submitting ? <div className="h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : 'Record Payment'}
          </button>
        </div>
      )}

      {activeTab === 'RECORD' && success && (
        <div className="p-4 flex-1 flex flex-col items-center justify-center animate-in zoom-in-95">
          <div className="h-24 w-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Payment Recorded!</h2>
          <p className="text-lg font-semibold text-slate-500 mb-12 text-center">
            {selectedTenant?.name} paid <span className="text-emerald-600 font-bold">₹{paymentAmount}</span> via {paymentModes.find(m => m.id === paymentMode)?.label.replace(/[^\x00-\x7F]/g, "").trim()}
          </p>

          <div className="w-full space-y-4">
            <button 
              onClick={handleRecordAnother}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-slate-900/20"
            >
              Record Another
            </button>
            <button 
              onClick={() => { window.location.href = '/dashboard'; }}
              className="w-full h-14 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-lg active:bg-slate-50 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="p-4 flex-1 flex flex-col animate-in fade-in">
          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 mb-6 flex flex-col items-center text-center">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Collected This Month</p>
            <p className="text-4xl font-black text-emerald-700">₹{totalCollectedThisMonth.toLocaleString()}</p>
          </div>

          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
            {history.map(payment => (
              <div key={payment.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-base leading-tight mb-1">{payment.invoice.tenant.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                      {payment.paymentMode}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 text-lg">₹{Number(payment.amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="p-8 text-center text-slate-500 font-medium">
                No payments recorded this month yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
