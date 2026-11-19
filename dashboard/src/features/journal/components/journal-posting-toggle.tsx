import { ChevronDown, ChevronRight } from "lucide-react";
import {
  type JournalDirectiveType,
  isJournalTransaction,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/utils";

interface JournalPostingToggleProps {
  directive: JournalDirectiveType;
  entry: string;
  position: number;
  controls?: string;
  onClick?: () => void;
  expanded: boolean;
  /** When true, postings are forced visible globally — show a static indicator. */
  forcedOpen?: boolean;
  /** Sizing the caller's layout needs, such as a touch-sized target. */
  className?: string;
}

export function JournalPostingToggle({
  directive,
  entry,
  position,
  controls,
  onClick,
  expanded,
  forcedOpen = false,
  className,
}: JournalPostingToggleProps) {
  const { t } = useTranslations();
  if (!isJournalTransaction(directive)) {
    return null;
  }
  const amount = directive.postings?.length || 0;

  if (forcedOpen) {
    return (
      <span
        className={cn(
          "inline-flex h-7 min-w-8 items-center justify-center gap-1 px-1.5 text-muted-foreground",
          className,
        )}
      >
        <ChevronDown className="size-3.5" aria-hidden />
        <span
          className="min-w-[2ch] text-left text-xs tabular-nums"
          aria-hidden
        >
          {amount}
        </span>
        <span className="sr-only">
          {t("journal.visibleEntryPostings", {
            count: amount,
            entry,
            position,
          })}
        </span>
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 min-w-8 gap-1 px-1.5 text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
      aria-label={t(
        expanded ? "journal.hideEntryPostings" : "journal.showEntryPostings",
        { count: amount, entry, position },
      )}
      aria-expanded={expanded}
      aria-controls={controls}
    >
      {expanded ? (
        <ChevronDown className="size-3.5" />
      ) : (
        <ChevronRight className="size-3.5" />
      )}
      <span className="min-w-[2ch] text-left text-xs tabular-nums">
        {amount}
      </span>
    </Button>
  );
}
