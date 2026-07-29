import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/common/lib/utils/utils";

interface AccountPrefixNavigationProps {
  accountName: string;
  isClosed: boolean;
  onAccountClick: (accountName: string) => void;
}

export function AccountPrefixNavigation({
  accountName,
  isClosed,
  onAccountClick,
}: AccountPrefixNavigationProps) {
  const segments = accountName.split(":");
  const [hoveredPrefixIndex, setHoveredPrefixIndex] = useState<number | null>(
    null,
  );
  const [focusedPrefixIndex, setFocusedPrefixIndex] = useState<number | null>(
    null,
  );
  const activePrefixIndex = focusedPrefixIndex ?? hoveredPrefixIndex;

  return (
    <div
      className="flex max-w-full items-center gap-2 text-left outline-none"
      title={accountName}
    >
      <span
        className="min-w-0 max-w-40 truncate font-mono text-sm sm:max-w-none"
        onMouseLeave={() => setHoveredPrefixIndex(null)}
      >
        {segments.map((segment, index) => {
          const accountPrefix = segments.slice(0, index + 1).join(":");
          const isInActivePrefix =
            activePrefixIndex !== null && index <= activePrefixIndex;

          return (
            <button
              key={accountPrefix}
              type="button"
              className={cn(
                "cursor-pointer py-0.5 outline-none transition-colors duration-150 motion-reduce:transition-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50",
                index === 0 && isInActivePrefix && "rounded-l-sm",
                index === activePrefixIndex && "rounded-r-sm",
                isInActivePrefix
                  ? isClosed
                    ? "bg-muted text-foreground"
                    : "bg-primary/10 text-primary"
                  : isClosed
                    ? "text-muted-foreground hover:text-muted-foreground/80"
                    : "text-primary hover:text-primary/80",
              )}
              aria-label={accountPrefix}
              title={accountPrefix}
              onMouseEnter={() => setHoveredPrefixIndex(index)}
              onFocus={() => setFocusedPrefixIndex(index)}
              onBlur={() => setFocusedPrefixIndex(null)}
              onClick={(event) => {
                event.stopPropagation();
                onAccountClick(accountPrefix);
              }}
            >
              {index === 0 ? segment : `:${segment}`}
            </button>
          );
        })}
      </span>
      <ChevronRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-within:opacity-60" />
    </div>
  );
}
