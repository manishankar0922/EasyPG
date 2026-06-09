'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { 
  Calendar, 
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  CreditCard,
  IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  month: string;
  amount: number;
  dueDate: string;
  status: string;
  tenant: { name: string };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMode: 'UPI',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/invoices');
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.amount.toString(),
      paymentMode: 'UPI',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setShowPaymentModal(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setSubmitting(true);
    try {
      const { data } = await api.post('/payments', {
        invoiceId: selectedInvoice.id,
        amount: Number(paymentData.amount),
        paymentMode: paymentData.paymentMode,
        paymentDate: paymentData.paymentDate,
      });
      if (data.success) {
        setShowPaymentModal(false);
        fetchInvoices();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Generation State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState({
    month: format(new Date(), 'MMMM yyyy'),
    dueDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [generating, setGenerating] = useState(false);

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data } = await api.post('/invoices/generate-monthly', bulkData);
      if (data.success) {
        setShowBulkModal(false);
        fetchInvoices();
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading && invoices.length === 0) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowBulkModal(true)}
            className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Calendar className="h-4 w-4" />
            <span>Generate Monthly</span>
          </button>
          <Link 
            href="/invoices/create"
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Invoice</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 text-center uppercase tracking-wider">Unpaid Total</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 text-center">
            ₹{invoices.filter(i => i.status !== 'PAID').reduce((acc, i) => acc + Number(i.amount), 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 text-center uppercase tracking-wider">Paid This Month</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 text-center">
            ₹{invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + Number(i.amount), 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 text-center uppercase tracking-wider">Overdue Count</p>
          <p className="mt-2 text-3xl font-bold text-rose-600 text-center">
            {invoices.filter(i => i.status !== 'PAID' && new Date(i.dueDate) < new Date()).length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Tenant</th>
              <th className="px-6 py-4">Month</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">{invoice.tenant.name}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">{invoice.month}</td>
                <td className="px-6 py-4 font-bold text-slate-900">₹{Number(invoice.amount).toLocaleString()}</td>
                <td className="px-6 py-4 text-slate-600">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                    {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    invoice.status === 'PAID' ? "bg-emerald-50 text-emerald-700" : 
                    invoice.status === 'PARTIAL' ? "bg-blue-50 text-blue-700" :
                    new Date(invoice.dueDate) < new Date() ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                  )}>
                    {invoice.status === 'PAID' ? <CheckCircle2 className="h-3 w-3" /> : 
                     new Date(invoice.dueDate) < new Date() ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    <span>{invoice.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {invoice.status !== 'PAID' && (
                    <button 
                      onClick={() => openPaymentModal(invoice)}
                      className="text-blue-600 hover:text-blue-700 font-medium mr-4"
                    >
                      Receive Payment
                    </button>
                  )}
                  <button className="text-slate-400 hover:text-slate-600">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Receive Payment</h2>
                <p className="text-sm text-slate-500">For {selectedInvoice.tenant.name} - {selectedInvoice.month}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="rounded-full p-2 hover:bg-slate-100 transition">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handlePayment} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Amount Received</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 outline-none"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Payment Mode</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <select
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 outline-none appearance-none"
                    value={paymentData.paymentMode}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Payment Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 outline-none"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
ssName="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Billing Month</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2023"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm focus:border-blue-500 outline-none"
                  value={bulkData.month}
                  onChange={(e) => setBulkData({ ...bulkData, month: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Due Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm focus:border-blue-500 outline-none"
                  value={bulkData.dueDate}
                  onChange={(e) => setBulkData({ ...bulkData, dueDate: e.target.value })}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-[2] rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Generate Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
