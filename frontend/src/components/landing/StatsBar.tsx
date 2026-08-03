'use client';

import { useEffect, useRef, useState } from 'react';

type Stat = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  // Indian compact formatting flag — renders ₹1Cr+ instead of 10000000.
  compact?: boolean;
};

const STATS: Stat[] = [
  { value: 50, suffix: '+', label: 'Active branches' },
  { value: 5000, suffix: '+', label: 'Tenant records' },
  { value: 1, prefix: '₹', suffix: 'Cr+', label: 'Rent auto-generated', compact: false },
  { value: 200, prefix: '<', suffix: 'ms', label: 'Response time' },
];

export function StatsBar() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <section aria-label="Platform at a glance" className="border-y border-border bg-secondary/40">
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-8 md:grid-cols-4 md:px-6 md:py-10"
      >
        {STATS.map((s) => (
          <div key={s.label} className="px-2 text-center md:px-6">
            <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground md:text-4xl">
              <Counter stat={s} run={visible} />
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground md:text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Counter({ stat, run }: { stat: Stat; run: boolean }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setN(stat.value);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setN(stat.value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(stat.value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, stat.value]);

  const decimals = stat.decimals ?? 0;
  const display = n.toFixed(decimals);

  return (
    <span>
      {stat.prefix}
      {display}
      {stat.suffix}
    </span>
  );
}
