import type { ReactNode } from "react";
import { cn } from "@/common/lib/utils/utils";

interface PageHeaderProps {
  title: ReactNode;
  description: ReactNode;
  className?: string;
  /** Show the title and description below `md` too, not only to assistive technology. */
  showOnMobile?: boolean;
}

/**
 * Standard page header matching `LedgerPageHeading`'s typographic hierarchy:
 * always visible across phone, tablet, and desktop so every destination
 * establishes clear orientation and a single authoritative `<h1>`.
 */
export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
