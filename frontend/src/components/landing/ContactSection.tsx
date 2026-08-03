'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Clock, MapPin, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from './HowItWorks';
import { cn } from '@/lib/utils';

type ContactItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
};

const CONTACT: ContactItem[] = [
  { icon: Mail, label: 'Email', value: 'support@u9pgs.com', href: 'mailto:support@u9pgs.com' },
  { icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us', href: 'https://wa.me/919000000000' },
  { icon: Clock, label: 'Support hours', value: 'Mon–Sat, 9 AM – 6 PM IST' },
  { icon: MapPin, label: 'Location', value: 'Bengaluru, India' },
];

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ContactSection() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
      setError('Something went wrong. Please email us directly at support@u9pgs.com.');
    }
  }

  return (
    <section id="contact" className="scroll-mt-20 border-t border-border bg-secondary/40 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Contact"
          title="Talk to the U9PGs team"
          subtitle="Tell us about your PG and we'll set up a personalized walkthrough — no sales pressure, no commitment."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left — info */}
          <div className="flex flex-col justify-between gap-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {CONTACT.map((c) => {
                const content = (
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <c.icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {c.label}
                      </p>
                      <p className="truncate text-sm font-semibold text-foreground">{c.value}</p>
                    </div>
                  </div>
                );
                return c.href ? (
                  <a key={c.label} href={c.href} className="block focus-visible:outline-none">
                    {content}
                  </a>
                ) : (
                  <div key={c.label}>{content}</div>
                );
              })}
            </div>

            <div className="rounded-xl border border-primary/20 bg-accent p-5">
              <p className="text-sm font-semibold text-accent-foreground">
                Prefer to see it first?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Request a demo and we'll walk you through the dashboard with sample data from a real
                multi-branch PG. Roughly 20 minutes, no slides.
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            {status === 'success' ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="size-7" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Message sent</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Thanks for reaching out. We'll get back to you within one business day.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => setStatus('idle')}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Field label="Name" htmlFor="name">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className={inputCls}
                  />
                </Field>

                <Field label="Email or phone" htmlFor="contact" hint="So we can reach you back">
                  <input
                    id="contact"
                    name="contact"
                    type="text"
                    required
                    autoComplete="email"
                    placeholder="you@example.com or +91…"
                    className={inputCls}
                  />
                </Field>

                <Field label="Property details" htmlFor="message" hint="Branches, beds, what you need">
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    placeholder="I run 3 PG branches in Bengaluru with ~120 beds total…"
                    className={cn(inputCls, 'resize-y min-h-[110px]')}
                  />
                </Field>

                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={status === 'loading'}>
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send message
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  We'll never share your details. Replies within one business day.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const inputCls =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
