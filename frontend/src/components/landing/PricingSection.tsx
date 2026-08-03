import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SectionHeading } from './HowItWorks';

type Plan = {
  name: string;
  price: string;
  cadence?: string;
  bestFor: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: '₹0',
    cadence: '/month',
    bestFor: 'Single-branch PG, just getting started',
    features: ['1 branch', 'Up to 30 beds', 'Room heatmap', 'Auto rent ledger', 'WhatsApp receipts', 'Email support'],
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '₹499',
    cadence: '/month',
    bestFor: 'Growing hostels with 2–5 branches',
    features: [
      'Unlimited branches',
      'Unlimited tenants',
      'Everything in Starter',
      'P&L dashboard per branch',
      'Role-based access (Owner, Warden, Tenant)',
      'Priority support',
    ],
    cta: 'Get started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    bestFor: 'Large chains with 10+ branches',
    features: [
      'Custom bed & branch limits',
      'Dedicated account manager',
      'SLA & uptime guarantee',
      'Custom integrations',
      'Onboarding & training',
      '24/7 support',
    ],
    cta: 'Talk to sales',
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with you"
          subtitle="Start free. Upgrade only when your second branch opens. Cancel anytime — no lock-in."
        />

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-3 md:gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm md:p-7',
                plan.highlighted
                  ? 'border-primary ring-1 ring-primary shadow-md lg:-mt-2 lg:mb-2'
                  : 'border-border',
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.bestFor}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                  {plan.price}
                </span>
                {plan.cadence && <span className="text-sm text-muted-foreground">{plan.cadence}</span>}
              </div>

              <Button
                variant={plan.highlighted ? 'default' : 'outline'}
                size="lg"
                className="mt-6 w-full"
                onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {plan.cta}
              </Button>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
