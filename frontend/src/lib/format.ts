/**
 * format.ts — locale-aware formatting for the Indian PG/hostel market.
 * Currency is INR; large amounts collapse to lakh/crore the way owners read them.
 */

type Lang = 'en' | 'hi' | 'te';

const LOCALE: Record<Lang, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

/** ₹1,23,456 — full precision, Indian digit grouping. */
export function formatCurrency(value: number, lang: Lang = 'en'): string {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(LOCALE[lang], {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** ₹1.2L / ₹3.4Cr — compact form for KPI tiles and axis ticks. */
export function formatCompactCurrency(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/** Plain grouped number: 1,23,456 */
export function formatNumber(value: number, lang: Lang = 'en'): string {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

export function formatPercent(value: number, digits = 0): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toFixed(digits)}%`;
}

function trim(n: number): string {
  // 1.20 -> "1.2", 3.00 -> "3"
  return n.toFixed(1).replace(/\.0$/, '');
}

const MONTHS_SHORT: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्तू', 'नव', 'दिस'],
  te: ['జన', 'ఫిబ్ర', 'మార్చి', 'ఏప్రి', 'మే', 'జూన్', 'జులై', 'ఆగ', 'సెప్టెం', 'అక్టో', 'నవం', 'డిసెం'],
};

/** "2026-06" -> "Jun" (localized). */
export function monthLabel(ym: string, lang: Lang = 'en'): string {
  const [, m] = ym.split('-');
  const idx = Number(m) - 1;
  return MONTHS_SHORT[lang]?.[idx] ?? ym;
}

/** Trigger a client-side CSV download from an array of row objects. */
export function downloadCsv(filename: string, rows: Record<string, string | number>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
