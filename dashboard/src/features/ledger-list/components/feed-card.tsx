import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  GitCommit,
  History,
} from "lucide-react";
import { format, formatDistanceToNow, isValid } from "date-fns";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/common/components/ui/avatar";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { FeedSource, type GetFeedQuery } from "@/graphql/definitions";
import { getLedgerDestination } from "../lib/feed-destination";

type FeedItem = GetFeedQuery["getFeed"]["items"][number];

function FeedTimestamp({ publishedAt }: { publishedAt: string }) {
  const publishDate = new Date(publishedAt);
  const validDate = isValid(publishDate);

  return (
    <time
      dateTime={validDate ? publishDate.toISOString() : publishedAt}
      title={validDate ? format(publishDate, "PPpp") : undefined}
      className="text-xs text-muted-foreground"
    >
      {validDate
        ? formatDistanceToNow(publishDate, { addSuffix: true })
        : publishedAt}
    </time>
  );
}

function LedgerActivityCard({ item }: { item: FeedItem }) {
  const { t } = useTranslations();
  const destination = getLedgerDestination(item);
  const ActivityIcon = destination?.commitSha ? GitCommit : History;

  return (
    <article className="overflow-hidden border border-border bg-card shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ActivityIcon className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {destination ? (
              <Link
                to="/ledger/$ledgerOwner/$ledgerName"
                params={{
                  ledgerOwner: destination.owner,
                  ledgerName: destination.name,
                }}
                className="font-semibold text-foreground hover:text-primary hover:underline hover:underline-offset-4"
              >
                {destination.name}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">
                {item.title}
              </span>
            )}
            {item.author && (
              <span className="text-sm text-muted-foreground">
                · {item.author}
              </span>
            )}
            <span aria-hidden="true" className="text-muted-foreground/60">
              ·
            </span>
            <FeedTimestamp publishedAt={item.publishedAt} />
          </div>
          {destination && (
            <p className="mt-1 text-sm text-muted-foreground">{item.title}</p>
          )}
        </div>

        {destination && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-mr-2 shrink-0 text-muted-foreground"
          >
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/commits"
              params={{
                ledgerOwner: destination.owner,
                ledgerName: destination.name,
              }}
              aria-label={t("commits.versionHistory")}
            >
              <History className="size-4" />
              <span className="hidden sm:inline">
                {t("commits.versionHistory")}
              </span>
            </Link>
          </Button>
        )}
      </div>

      {(item.summary || destination?.commitSha) && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 sm:px-5">
          {item.summary && (
            <div className="space-y-1 text-sm text-muted-foreground">
              {item.summary
                .split("\n")
                .filter(Boolean)
                .map((line, index) => (
                  <p key={`${line}-${index}`} className="truncate">
                    {line}
                  </p>
                ))}
            </div>
          )}
          {destination?.commitSha && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {destination.commitSha.slice(0, 7)}
              </code>
              <Button asChild variant="link" size="sm" className="px-0">
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/commit/$commitSha"
                  params={{
                    ledgerOwner: destination.owner,
                    ledgerName: destination.name,
                    commitSha: destination.commitSha,
                  }}
                >
                  {t("commits.changes")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ProductUpdateCard({ item }: { item: FeedItem }) {
  const initials = item.author
    ? item.author
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "BC";

  return (
    <article className="border border-border bg-card shadow-xs transition-colors hover:bg-accent/40">
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex gap-3 p-4 sm:gap-4 sm:p-5"
      >
        <Avatar className="size-9 shrink-0 rounded-md">
          <AvatarImage
            src={item.authorAvatar || "/lgasset/logo.png"}
            alt={item.author || "Beancount"}
          />
          <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-foreground">
              {item.author || "Beancount"}
            </span>
            <span aria-hidden="true" className="text-muted-foreground/60">
              ·
            </span>
            <FeedTimestamp publishedAt={item.publishedAt} />
          </div>
          <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary sm:text-lg">
            {item.title}
          </h3>
          {item.summary && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          )}
        </div>

        <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground">
          {item.source === FeedSource.Blog ? (
            <ExternalLink className="size-4" aria-hidden="true" />
          ) : (
            <BookOpen className="size-4" aria-hidden="true" />
          )}
        </div>
      </a>
    </article>
  );
}

export function FeedCard(item: FeedItem) {
  return item.source === FeedSource.LedgerRss ? (
    <LedgerActivityCard item={item} />
  ) : (
    <ProductUpdateCard item={item} />
  );
}
