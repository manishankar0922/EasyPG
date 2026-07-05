'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { useUserRole } from '@/hooks/useUserRole';
import { IndianRupee, Wallet, PieChart, Users, Download, Printer, TriangleAlert } from 'lucide-react';
import { Card, CardHeader, StatTile, Skeleton, EmptyState } from '@/components/analytics/ui';
import { AreaTrendChart, BarCompare, GaugeDonut, type TrendPoint, type BarDatum } from '@/components/analytics/charts';
import { formatCompactCurrency, formatCurrency, monthLabel, downloadCsv } from '@/lib/format';

type Overview = {
  total_collected: number;
  total_invoiced: number;
  total_pending: number;
  occupancy_percentage: number | string;
  occupied_capacity: number;
  total_capacity: number;
  total_tenants: number;
};

type PendingRow = {
  id: string;
  tenantName: string;
  amount: number;
  paid: number;
  pending: number;
  dueDate: string;
};

export default function ReportsPage() {
  const { t, lang } = useLanguage();
  const { branches } = useBranch();
  const { isOwner } = useUserRole();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<Record<string, number>>({});
  const [occupancy, setOccupancy] = useState<BarDatum[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Owners see every branch by default and can narrow to one; wardens are
  // scoped to their own branch by the backend regardless of this value.
  const [scope, setScope] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const params = scope !== 'all' ? { branchId: scope } : undefined;
      const [ov, rev, occ, pend] = await Promise.allSettled([
        api.get('/dashboard/overview', { params }),
        api.get('/dashboard/revenue', { params }),
        api.get('/dashboard/occupancy', { params }),
        api.get('/dashboard/pending-payments', { params }),
      ]);
      if (cancelled) return;

      if (ov.status === 'fulfilled' && ov.value.data?.success) setOverview(ov.value.data.data);
      else if (ov.status === 'rejected') setError(ov.reason?.message || t.error);

      if (rev.status === 'fulfilled' && rev.value.data?.success) setRevenue(rev.value.data.data || {});

      if (occ.status === 'fulfilled' && occ.value.data?.success) {
        setOccupancy(
          (occ.value.data.data || []).map((b: any) => ({
            label: b.branchName,
            value: Number(b.percentage),
            caption: `${b.occupied}/${b.total} ${t.beds}`,
          })),
        );
      }

      if (pend.status === 'fulfilled' && pend.value.data?.success) setPending(pend.value.data.data || []);

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t, scope]);

  // revenue object -> ascending 12-month series
  const trend: TrendPoint[] = useMemo(() => {
    return Object.keys(revenue)
      .sort()
      .map((ym) => ({ label: monthLabel(ym, lang), value: revenue[ym] }));
  }, [revenue, lang]);

  const momDelta = useMemo(() => {
    if (trend.length < 2) return null;
    const cur = trend[trend.length - 1].value;
    const prev = trend[trend.length - 2].value;
    if (!prev) return null;
    return ((cur - prev) / prev) * 100;
  }, [trend]);

  const collectionRate = useMemo(() => {
    if (!overview || !overview.total_invoiced) return 0;
    return (overview.total_collected / overview.total_invoiced) * 100;
  }, [overview]);

  const occPct = overview ? Number(overview.occupancy_percentage) : 0;

  function exportPending() {
    downloadCsv(
      `pending-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      pending.map((p) => ({
        Tenant: p.tenantName,
        Amount: p.amount,
        Paid: p.paid,
        Pending: p.pending,
        'Due Date': new Date(p.dueDate).toLocaleDateString('en-GB'),
      })),
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 px-5 py-4 backdrop-blur-md print:static">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t.analyticsTitle}</h1>
            <p className="text-sm font-medium text-slate-400">{t.analyticsSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={exportPending}
              aria-label={t.exportCsv}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t.exportCsv}</span>
            </button>
            <button
              onClick={() => window.print()}
              aria-label={t.printReport}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">{t.printReport}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        {/* Branch filter — owners can compare all branches or focus on one */}
        {isOwner && branches.length > 1 && (
          <div role="group" aria-label={t.branchOccupancy} className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={() => setScope('all')}
              aria-pressed={scope === 'all'}
              className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                scope === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.allBranches}
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setScope(b.id)}
                aria-pressed={scope === b.id}
                className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  scope === b.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading || !overview ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[116px]" />)
          ) : (
            <>
              <StatTile
                label={t.collected}
                value={formatCompactCurrency(overview.total_collected)}
                sub={t.vsLastMonth}
                icon={Wallet}
                tone="good"
                delta={momDelta}
              />
              <StatTile
                label={t.occupancy}
                value={`${occPct.toFixed(0)}%`}
                sub={`${overview.occupied_capacity}/${overview.total_capacity} ${t.beds}`}
                icon={PieChart}
                tone="accent"
              />
              <StatTile
                label={t.pendingDues}
                value={formatCompactCurrency(overview.total_pending)}
                sub={`${pending.length} ${t.tenants}`}
                icon={IndianRupee}
                tone={overview.total_pending > 0 ? 'warning' : 'good'}
              />
              <StatTile
                label={t.activeTenants}
                value={String(overview.total_tenants)}
                icon={Users}
                tone="neutral"
              />
            </>
          )}
        </section>

        {/* Revenue trend */}
        <Card>
          <CardHeader
            title={t.revenueTrend}
            subtitle={t.last12Months}
            action={
              !loading && trend.length > 0 ? (
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-slate-900">
                    {formatCurrency(trend[trend.length - 1].value)}
                  </div>
                  <div className="text-xs font-medium text-slate-400">{t.thisMonth}</div>
                </div>
              ) : undefined
            }
          />
          <div className="p-3 pt-4">
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : trend.some((p) => p.value > 0) ? (
              <AreaTrendChart data={trend} ariaLabel={`${t.revenueTrend} — ${t.last12Months}`} />
            ) : (
              <EmptyState message={t.noData} />
            )}
          </div>
        </Card>

        {/* Collection rate + Branch occupancy */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={t.collectionRate} subtitle={t.collectionRateSub} />
            <div className="flex items-center justify-center p-6">
              {loading ? <Skeleton className="h-44 w-44 rounded-full" /> : <GaugeDonut percent={collectionRate} label={t.collected} />}
            </div>
          </Card>

          <Card>
            <CardHeader title={t.branchOccupancy} />
            <div className="p-5 pt-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : occupancy.length ? (
                <BarCompare data={occupancy} unit="%" />
              ) : (
                <EmptyState message={t.noData} />
              )}
            </div>
          </Card>
        </div>

        {/* Pending payments table */}
        <Card>
          <CardHeader
            title={t.pendingPaymentsTitle}
            subtitle={`${pending.length} ${t.tenants}`}
            action={
              pending.length > 0 ? (
                <button
                  onClick={exportPending}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 print:hidden"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t.exportCsv}
                </button>
              ) : undefined
            }
          />
          <div className="p-3 pt-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <EmptyState message={t.noPending} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-2 py-2 font-semibold">{t.colTenant}</th>
                      <th className="px-2 py-2 text-right font-semibold">{t.colAmount}</th>
                      <th className="px-2 py-2 text-right font-semibold">{t.colPending}</th>
                      <th className="px-2 py-2 text-right font-semibold">{t.colDueDate}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pending.slice(0, 25).map((p) => {
                      const overdue = new Date(p.dueDate) < new Date();
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="px-2 py-2.5 font-medium text-slate-800">{p.tenantName}</td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(Number(p.amount))}</td>
                          <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                            {formatCurrency(p.pending)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                                overdue ? 'bg-rose-50 text-rose-600' : 'text-slate-500'
                              }`}
                            >
                              {overdue && (
                                <>
                                  <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden />
                                  <span className="sr-only">{t.overdue}</span>
                                </>
                              )}
                              {new Date(p.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
