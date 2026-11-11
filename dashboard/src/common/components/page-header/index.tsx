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
 * Below `md` the header is hidden by design (w4/228), but only visually: its
 * h1 stays in the accessibility tree, where screen-reader users navigate a
 * page by heading (w2/115). The visually hidden wrapper is out of flow, so
 * it adds no gap to the layout around it.
 */
export function PageHeader({
  title,
  description,
  className,
  showOnMobile = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1",
        !showOnMobile && "max-md:sr-only",
        className,
      )}
    >
      <h1 className="text-lg sm:text-xl font-normal text-muted-foreground">
        {title}
      </h1>
      <p
        className={cn(
          "text-sm text-muted-foreground leading-relaxed",
          !showOnMobile && "max-md:hidden",
        )}
      >
        {description}
      </p>
    </div>
  );
}
