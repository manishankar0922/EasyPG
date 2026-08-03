'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleNav = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-200',
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6"
      >
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5"
          aria-label="U9PGs home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight text-foreground">U9PGs</span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNav(link.href)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden md:block">
          <Button size="sm" onClick={() => handleNav('#contact')}>
            Request a demo
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-secondary md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 top-16 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 animate-fade-up border-b border-border bg-background px-4 pb-6 pt-2 shadow-lg">
            <div className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNav(link.href)}
                  className="rounded-lg px-3 py-3 text-left text-base font-medium text-foreground hover:bg-secondary"
                >
                  {link.label}
                </button>
              ))}
              <Button className="mt-3 w-full" size="lg" onClick={() => handleNav('#contact')}>
                Request a demo
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
