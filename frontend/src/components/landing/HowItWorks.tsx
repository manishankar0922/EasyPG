import { Building2, UserPlus, Wallet } from 'lucide-react';

type Step = {
  n: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Set up your branch',
    body: 'Add your hostel, configure rooms, floors, and beds. Invite your warden in under two minutes — everything stays role-separated and audit-ready.',
    icon: Building2,
  },
  {
    n: '02',
    title: 'Check in tenants',
    body: 'Assign beds, capture ID details, and set monthly rent. The tenant profile is live instantly, with a carry-forward balance tracked from day one.',
    icon: UserPlus,
  },
  {
    n: '03',
    title: 'Collect & track automatically',
    body: 'Dues generate on the 1st of every month. Record payments, send WhatsApp receipts, and read your P&L straight from the dashboard.',
    icon: Wallet,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Live in three steps"
          subtitle="From empty spreadsheet to a fully tracked PG operation in a single afternoon. No data migration team required."
        />

        <ol className="mt-12 grid gap-5 md:grid-cols-3 md:gap-6">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="relative flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <step.icon className="size-5" />
                </span>
                <span className="font-mono text-sm font-semibold text-muted-foreground/60">
                  {step.n}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
