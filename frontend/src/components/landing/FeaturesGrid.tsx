import { Grid3x3, BookText, BarChart3, MessageCircle, Network, ShieldCheck } from 'lucide-react';
import { SectionHeading } from './HowItWorks';

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: Grid3x3,
    title: 'Room heatmap',
    body: 'A 2D visual grid of every bed — occupied, vacant, and upcoming vacancies — across floors and blocks at a glance.',
  },
  {
    icon: BookText,
    title: 'Auto rent ledger',
    body: 'Monthly dues generate themselves with carry-forward balance tracking. No more end-of-month reconciliation nightmares.',
  },
  {
    icon: BarChart3,
    title: 'P&L dashboard',
    body: 'Expected vs collected vs pending revenue, per branch. Know exactly where every rupee stands, every day.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp receipts',
    body: 'One-tap payment confirmations delivered straight to tenants on WhatsApp. Fewer "did you get it?" calls.',
  },
  {
    icon: Network,
    title: 'Multi-branch',
    body: 'Manage every property from a single owner account. Switch branches in a click, compare performance across the chain.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    body: 'Strict data isolation between Owner, Warden, and Tenant roles. The right people see exactly what they need — nothing more.',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-secondary/40 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything a PG owner actually needs"
          subtitle="Six tools that replace the spreadsheets, WhatsApp groups, and sticky notes running your operation today."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
