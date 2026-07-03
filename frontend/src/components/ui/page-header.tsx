import { cn } from "@/lib/utils";

/** Consistent sticky page header used across dashboard screens. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className,
  sticky = true,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Row rendered below the title (filters, tabs, search). */
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <header
      className={cn(
        "z-10 border-b border-slate-200/70 bg-white/80 px-5 py-4 backdrop-blur-md",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm font-medium text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}
