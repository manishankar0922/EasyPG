'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, Calendar, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  admissions?: Array<{
    monthlyRent: string;
  }>;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    tenantId: '',
    month: format(new Date(), 'MMMM yyyy'),
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    async function fetchTenants() {
      try {
        const { data } = await api.get('/tenants?status=ACTIVE');
        if (data.success) {
          setTenants(data.data);
          if (data.data.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              tenantId: data.data[0].id,
              amount: data.data[0].admissions?.[0]?.monthlyRent || ''
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch tenants', err);
      }
    }
    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/invoices', {
        ...formData,
        amount: Number(formData.amount)
      });
      if (data.success) {
        router.push('/invoices');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate invoice';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/invoices" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Generate New Invoice</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Select Tenant</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.tenantId}
                  onChange={(e) => {
                    const tenant = tenants.find(t => t.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      tenantId: e.target.value,
                      amount: tenant?.admissions?.[0]?.monthlyRent || ''
                    });
                  }}
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Billing Month</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2023"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Amount Due</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-8 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
