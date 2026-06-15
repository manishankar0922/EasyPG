'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Loader2,
  Wallet,
  CalendarDays,
  IndianRupee,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Payment {
  id: string;
  amount: string;
  paymentMode: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'GPay' | 'PhonePe';
  paymentDate: string;
  invoice: {
    month: string;
    tenant: { name: string };
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);
        const { data } = await api.get('/payments');
        if (data.success) {
          setPayments(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch payments', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 py-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t.payments}</h1>
        <p className="text-sm font-semibold text-slate-500">{t.history}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Total Collected Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 shadow-md text-white">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Wallet className="h-5 w-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">{t.totalCollected}</h2>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black">₹{totalCollected.toLocaleString()}</span>
          </div>
        </div>

        {/* Payments List */}
        <div>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{t.pastPayments}</h2>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-bold text-slate-400">{t.loading}</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100 flex flex-col items-center gap-3">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                <IndianRupee className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-500">{lang === 'te' ? 'చెల్లింపులు కనుగొనబడలేదు' : 'No payments found'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg leading-none mb-1">
                        {p.invoice.tenant.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400">
                        {lang === 'te' ? 'అద్దె: ' : 'Rent for '}{new Date(p.invoice.month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600 text-xl leading-none">
                        ₹{Number(p.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                        {p.paymentMode.replace('_', ' ')}
                      </span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
