'use client';

import { ArrowRight, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function scrollTo(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const TRUST = ['No credit card required', '14-day free trial', 'Supports multi-branch hostels'] as const;

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Soft brand wash + grid lines, kept recessive per the design system */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-accent via-background to-background" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #E2E8F0 1px, transparent 1px), linear-gradient(to bottom, #E2E8F0 1px, transparent 1px)',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-28 pb-16 md:px-6 md:pt-36 md:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
          {/* Copy */}
          <div className="animate-fade-up text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-success" />
              Built for Indian PG &amp; hostel owners
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Run your PG business
              <br className="hidden sm:block" />{' '}
              <span className="text-primary">on autopilot.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
              Automate rent collection, track occupancy in real time, and manage multiple
              branches &mdash; all from one calm, fast dashboard. Less paperwork, more
              occupied beds.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button size="xl" className="w-full sm:w-auto" onClick={() => scrollTo('#contact')}>
                Start free trial
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => scrollTo('#how-it-works')}
              >
                See how it works
              </Button>
            </div>

            <ul className="mt-7 flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6 lg:justify-start">
              {TRUST.map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Product mockup */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * HeroMockup — a faithful, on-brand re-creation of the U9PGs dashboard chrome
 * (room heatmap + revenue tile) in markup. No external image, so it stays crisp
 * at any resolution and loads instantly.
 */
function HeroMockup() {
  // 6 cols x 3 rows — occupied / vacant / upcoming mix
  const cells = [
    'occ', 'occ', 'vac', 'occ', 'occ', 'soon',
    'occ', 'soon', 'occ', 'occ', 'vac', 'occ',
    'occ', 'occ', 'occ', 'vac', 'occ', 'occ',
  ] as const;

  return (
    <div className="relative">
      {/* Floating receipts chip */}
      <div className="absolute -left-3 top-20 z-20 hidden animate-fade-up rounded-xl border border-border bg-card p-3 shadow-lg [animation-delay:300ms] sm:block">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-success/10 text-success">
            <Check className="size-4" />
          </span>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">WhatsApp receipt sent</p>
            <p className="text-xs font-semibold text-foreground">₹6,500 · Room 204</p>
          </div>
        </div>
      </div>

      {/* Floating occupancy chip */}
      <div className="absolute -right-2 bottom-16 z-20 hidden animate-fade-up rounded-xl border border-border bg-card p-3 shadow-lg [animation-delay:400ms] sm:block">
        <p className="text-[11px] font-medium text-muted-foreground">Occupancy</p>
        <p className="text-xl font-bold tabular-nums text-foreground">
          94<span className="text-sm text-muted-foreground">%</span>
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Window bar */}
        <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/30" />
          <span className="size-2.5 rounded-full bg-amber-400/60" />
          <span className="size-2.5 rounded-full bg-success/40" />
          <span className="ml-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Building2 className="size-3.5" />
            Indiranagar Branch · Block A
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-5">
          {/* Heatmap */}
          <div className="lg:col-span-3">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Room heatmap
              </p>
              <span className="text-[11px] font-medium text-muted-foreground">Block A · 18 beds</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {cells.map((c, i) => (
                <div
                  key={i}
                  className={
                    'aspect-square rounded-md border ' +
                    (c === 'occ'
                      ? 'border-primary/20 bg-primary/85'
                      : c === 'vac'
                        ? 'border-border bg-secondary'
                        : 'border-amber-300 bg-amber-100')
                  }
                  title={c === 'occ' ? 'Occupied' : c === 'vac' ? 'Vacant' : 'Vacating soon'}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <Legend cls="bg-primary/85" label="Occupied · 14" />
              <Legend cls="bg-secondary border border-border" label="Vacant · 2" />
              <Legend cls="bg-amber-100 border border-amber-300" label="Vacating soon · 2" />
            </div>
          </div>

          {/* Revenue tile */}
          <div className="lg:col-span-2">
            <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-background p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Collected this month
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  ₹4.82L
                </p>
                <p className="mt-0.5 text-xs font-medium text-success">+12% vs last month</p>
              </div>

              {/* Mini bar chart */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Last 6 months</p>
                <div className="flex h-14 items-end gap-1.5">
                  {[42, 55, 48, 63, 70, 82].map((h, i) => (
                    <div
                      key={i}
                      className={
                        'flex-1 rounded-sm ' + (i === 5 ? 'bg-primary' : 'bg-primary/25')
                      }
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold tabular-nums text-foreground">₹38,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={'size-2.5 rounded-sm ' + cls} />
      {label}
    </span>
  );
}
