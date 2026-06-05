'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Calendar, 
  User, 
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  amount: string;
  paymentMode: 'UPI' | 'CASH' | 'BANK_TRANSFER';
  paymentDate: string;
  invoice: {
    month: string;
    tenant: { name: string };
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500">History of all transactions and revenue collected.</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-4 py-2 border border-emerald-100">
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Collected</p>
          <p className="text-xl font-bold text-emerald-700">
            ₹{payments.reduce((acc, p) => acc + Number(p.amount), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Tenant & Invoice</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-full bg-slate-100 p-2">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.invoice.tenant.name}</p>
                        <p className="text-xs text-slate-500">Rent for {p.invoice.month}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                      {format(new Date(p.paymentDate), 'dd MMM yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {p.paymentMode.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-base font-bold text-slate-900">₹{Number(p.amount).toLocaleString()}</p>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No payment history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
