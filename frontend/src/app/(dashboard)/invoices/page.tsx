'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { 
  Calendar, 
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle
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

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const { data } = await api.get('/invoices');
        if (data.success) {
          setInvoices(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch invoices', err);
      }
    }
    fetchInvoices();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
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
                  <button className="text-blue-600 hover:text-blue-700 font-medium mr-4">Receive Payment</button>
                  <button className="text-slate-400 hover:text-slate-600">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
