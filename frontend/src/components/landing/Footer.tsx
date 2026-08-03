import { Mail, MessageCircle } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="text-lg font-bold tracking-tight text-foreground">U9PGs</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              PG &amp; hostel management on autopilot. Automate rent, track occupancy, and run every
              branch from one dashboard.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="mailto:support@u9pgs.com"
                aria-label="Email U9PGs"
                className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Mail className="size-4" />
              </a>
              <a
                href="https://wa.me/919000000000"
                aria-label="WhatsApp U9PGs"
                className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <MessageCircle className="size-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} U9PGs. Built in Bengaluru, India.
          </p>
          <p className="text-xs text-muted-foreground">
            Made for Indian PG &amp; hostel owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
