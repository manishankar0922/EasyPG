'use client';

import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

/**
 * Analytics UI primitives — Linear/Stripe-style: hairline borders, soft shadows,
 * generous whitespace, one accent. Neutral ink carries text; color carries data.
 */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = 'accent' | 'good' | 'warning' | 'critical' | 'neutral';

const TONE_ICON: Record<Tone, string> = {
  accent: 'bg-blue-50 text-blue-600',
  good: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  critical: 'bg-rose-50 text-rose-600',
  neutral: 'bg-slate-100 text-slate-500',
};

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: Tone;
  /** signed percentage change vs previous period */
  delta?: number | null;
}) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="p-4 transition-shadow hover:shadow-md hover:shadow-slate-900/[0.06]">
      <div className="flex items-center justify-between">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', TONE_ICON[tone])}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        {hasDelta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
              up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta as number).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-[26px] font-bold leading-none tracking-tight text-slate-900">{value}</div>
        <div className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        {sub && <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div>}
      </div>
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-100', className)} />;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 h-10 w-10 rounded-full bg-slate-100" />
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
}
