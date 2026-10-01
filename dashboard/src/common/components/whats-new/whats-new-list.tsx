import { isValid } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { useFormatRelativeTime } from "@/common/hooks/use-date-locale";
import { useTranslations } from "@/common/hooks/use-translations";
import type { ChangelogRelease } from "@/common/hooks/use-changelog-watermark";
import { cn } from "@/common/lib/utils/utils";

/** Rows enter one after another rather than all at once. */
const ROW_STAGGER_MS = 70;

/**
 * A release date the way a Beancount ledger writes one: `YYYY-MM-DD`, in
 * monospace, left-to-right in every locale. Releases are published at UTC
 * midnight, so the UTC calendar day is the publication date everywhere; the
 * localized relative time lives in the tooltip.
 */
export function ReleaseDate({
  publishedAt,
  className,
}: {
  publishedAt: unknown;
  className?: string;
}) {
  const formatRelativeTime = useFormatRelativeTime();
  const date = new Date(String(publishedAt));
  const valid = isValid(date);
  return (
    <time
      dir="ltr"
      dateTime={valid ? date.toISOString() : undefined}
      title={valid ? formatRelativeTime(date) : undefined}
      className={cn(
        "shrink-0 whitespace-nowrap font-mono text-xs tabular-nums",
        className,
      )}
    >
      {valid ? date.toISOString().slice(0, 10) : ""}
    </time>
  );
}

/**
 * Beancount flag semantics: `!` needs attention (unread), `*` cleared (read).
 * The glyph is decorative; screen readers get the localized label. Keying the
 * glyph on its state remounts it when a release is read, so the swap reads as
 * a small pop rather than a jump cut.
 */
export function ReleaseFlag({ unread }: { unread: boolean }) {
  const { t } = useTranslations();
  return (
    <>
      <span className="inline-flex w-3 shrink-0 justify-center">
        <span
          key={unread ? "unread" : "read"}
          aria-hidden="true"
          data-testid="release-flag"
          data-unread={unread ? "true" : "false"}
          className={cn(
            "font-mono text-sm font-bold leading-none",
            "animate-in fade-in-0 zoom-in-50 animation-duration-200 ease-out",
            "motion-reduce:animate-none",
            unread ? "text-primary" : "text-muted-foreground/60",
          )}
        >
          {unread ? "!" : "*"}
        </span>
      </span>
      <span className="sr-only">
        {unread ? t("common.whatsNewUnreadFlag") : t("common.whatsNewReadFlag")}
      </span>
    </>
  );
}

interface WhatsNewListProps {
  items: ChangelogRelease[];
  isUnread: (item: ChangelogRelease) => boolean;
  onOpen: (item: ChangelogRelease) => void;
  className?: string;
}

/**
 * Releases as dated, flagged ledger lines: date, flag, title, summary. An
 * unread row carries a primary rule on its leading edge, so how much is new is
 * legible before a single title is read. Each row opens the localized release
 * post in a new tab.
 */
export function WhatsNewList({
  items,
  isUnread,
  onOpen,
  className,
}: WhatsNewListProps) {
  return (
    <ol className={cn("divide-y divide-border", className)}>
      {items.map((item, index) => {
        const unread = isUnread(item);
        return (
          <li key={item.id}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpen(item)}
              // Middle-click opens a background tab and fires `auxclick`
              // rather than `click`, so a release opened that way would keep
              // its unread flag. Cmd/Ctrl-click still arrives as `click` and
              // needs no special case; picking "open in new tab" from the
              // context menu fires nothing at all and cannot be observed.
              onAuxClick={(event) => {
                if (event.button === 1) onOpen(item);
              }}
              data-testid="release-row"
              style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}
              className={cn(
                "group relative flex flex-col gap-1 border-s-2 px-4 py-3.5 outline-none",
                "transition-colors duration-150 ease-out hover:bg-muted/40",
                "focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                "animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both animation-duration-300",
                "motion-reduce:animate-none motion-reduce:transition-none",
                "sm:flex-row sm:items-baseline sm:gap-3 sm:pe-11",
                unread ? "border-s-primary" : "border-s-transparent",
              )}
            >
              <span className="flex shrink-0 items-baseline gap-2 text-muted-foreground">
                <ReleaseDate publishedAt={item.publishedAt} />
                <ReleaseFlag unread={unread} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm leading-snug text-foreground transition-colors duration-150",
                    "group-hover:text-primary motion-reduce:transition-none",
                    unread ? "font-semibold" : "font-medium",
                  )}
                >
                  {item.title}
                </span>
                {item.summary && (
                  <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {item.summary}
                  </span>
                )}
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute end-4 top-4 hidden size-4 shrink-0",
                  "translate-y-0.5 text-muted-foreground opacity-0",
                  "transition-all duration-200 ease-out",
                  "group-hover:translate-y-0 group-hover:text-primary group-hover:opacity-100",
                  "group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
                  "motion-reduce:transition-none sm:block",
                )}
              />
            </a>
          </li>
        );
      })}
    </ol>
  );
}
