import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { track } from "@/common/analytics/events";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  ReleaseDate,
  ReleaseFlag,
  WhatsNewList,
} from "@/common/components/whats-new/whats-new-list";
import {
  useChangelogWatermark,
  type ChangelogRelease,
} from "@/common/hooks/use-changelog-watermark";
import { useTranslations } from "@/common/hooks/use-translations";

const HEADING_ID = "whats-new-heading";
const SECTION_ID = "whats-new-releases";

/**
 * Releases since the user's last visit, at the top of the dashboard home.
 *
 * Expanded with flagged rows while anything is unread, one quiet line once
 * everything has been seen, and nothing at all when the changelog cannot be
 * loaded: marketing content never shows an error on the user's home page.
 * Flags clear only on an explicit action (opening a release or "Mark all as
 * read"), never just because the page was visited. Every release the hook
 * counts is rendered: a count that outlived its rows left the block claiming
 * unread releases the user had no way to open.
 */
export function WhatsNew() {
  const { t } = useTranslations();
  const changelog = useChangelogWatermark();
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const { unreadCount, items, loading, failed } = changelog;

  if (failed || (!loading && items.length === 0)) {
    return null;
  }

  if (loading && items.length === 0) {
    return (
      <div
        aria-busy="true"
        data-testid="whats-new-loading"
        className="space-y-2 py-1"
      >
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  const latest = items[0];
  const expanded = unreadCount > 0 || manuallyExpanded;
  const handleOpen = (item: ChangelogRelease) => {
    changelog.markRead(item);
    track("changelog_release_opened", { surface: "dashboard" });
  };

  // Read and out of the way: one quiet band the user can reopen, not a card
  // competing with the ledger activity below it.
  if (!expanded) {
    return (
      <section
        aria-labelledby={HEADING_ID}
        data-testid="whats-new-collapsed"
        className="animate-in fade-in-0 animation-duration-200 motion-reduce:animate-none"
      >
        <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-muted/40 motion-reduce:transition-none">
          <h2
            id={HEADING_ID}
            className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
          >
            {t("common.whatsNew")}
          </h2>
          <span aria-hidden="true" className="text-muted-foreground/50">
            ·
          </span>
          <a
            href={latest.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleOpen(latest)}
            // Middle-click fires `auxclick`, not `click` — see WhatsNewList.
            onAuxClick={(event) => {
              if (event.button === 1) handleOpen(latest);
            }}
            className="flex min-w-0 flex-1 items-baseline gap-2 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ReleaseDate
              publishedAt={latest.publishedAt}
              className="text-muted-foreground"
            />
            <ReleaseFlag unread={false} />
            <span className="truncate text-foreground transition-colors duration-150 hover:text-primary motion-reduce:transition-none">
              {latest.title}
            </span>
          </a>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-expanded={false}
            aria-controls={SECTION_ID}
            aria-label={t("common.whatsNewExpand")}
            onClick={() => setManuallyExpanded(true)}
          >
            <ChevronDown
              className="size-4 transition-transform duration-200 ease-out group-hover:translate-y-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      id={SECTION_ID}
      aria-labelledby={HEADING_ID}
      data-testid="whats-new-expanded"
      className="space-y-3 animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 ease-out motion-reduce:animate-none"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h2
            id={HEADING_ID}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {t("common.whatsNew")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? t("common.whatsNewUnread", { count: unreadCount })
              : t("common.whatsNewUpToDate")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changelog.markAllRead()}
            >
              {t("common.whatsNewMarkRead")}
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <a
              href={changelog.allReleasesUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("common.whatsNewChangelog")}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
          {unreadCount === 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-expanded
              aria-controls={SECTION_ID}
              aria-label={t("common.whatsNewCollapse")}
              onClick={() => setManuallyExpanded(false)}
            >
              <ChevronDown className="size-4 rotate-180" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <WhatsNewList
          items={items}
          isUnread={changelog.isUnread}
          onOpen={handleOpen}
        />
      </div>
    </section>
  );
}
