import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  GitCommitHorizontal,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import type {
  UserActivityFeedItem,
  UserRepository,
} from "@/graphql/definitions";

export function ProfileActivity({
  username,
  activities,
  example,
}: {
  username: string;
  activities: UserActivityFeedItem[];
  example?: UserRepository;
}) {
  const { t } = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const recent = [...activities].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return (
    <aside className="min-w-0 space-y-6">
      {example && (
        <Link
          to="/ledger/$ledgerOwner/$ledgerName"
          params={{ ledgerOwner: username, ledgerName: example.name }}
          className="group hidden rounded-xl lg:block border border-primary/15 bg-primary/5 p-6 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BookOpen aria-hidden="true" className="mb-5 size-6 text-primary" />
          <p className="mb-2 text-xs font-medium text-primary">
            {t("userProfile.newToBeancount")}
          </p>
          <h2 className="text-lg font-semibold tracking-tight">
            {t("userProfile.startExample")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("userProfile.exampleDescription")}
          </p>
          <span className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
            {t("userProfile.openExample")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </Link>
      )}
      <section
        aria-labelledby="profile-activity-heading"
        className="rounded-xl border bg-card p-5 sm:p-6"
      >
        <h2
          id="profile-activity-heading"
          className="mb-6 flex items-center gap-2 text-sm font-semibold"
        >
          <Activity
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          {t("userProfile.recentActivity")}
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("userProfile.noActivity")}
          </p>
        ) : (
          <ol id="profile-activity-list">
            {(expanded ? recent : recent.slice(0, 5)).map((activity) => {
              const date = new Date(activity.createdAt);
              const ledgerOwner =
                activity.repoFullName?.split("/")[0] || username;
              return (
                <li
                  key={activity.id}
                  className="relative flex gap-3 pb-6 last:pb-0 before:absolute before:start-3.5 before:top-7 before:bottom-0 before:border-s last:before:hidden"
                >
                  <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                    {activity.type === "create_repo" ? (
                      <Plus aria-hidden="true" className="size-3.5" />
                    ) : (
                      <GitCommitHorizontal
                        aria-hidden="true"
                        className="size-3.5"
                      />
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm leading-5">
                      {activity.repoName ? (
                        <Link
                          to="/ledger/$ledgerOwner/$ledgerName"
                          params={{
                            ledgerOwner,
                            ledgerName: activity.repoName,
                          }}
                          className="break-words rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {activity.content}
                        </Link>
                      ) : (
                        activity.content
                      )}
                    </p>
                    {!Number.isNaN(date.getTime()) && (
                      <time
                        dateTime={date.toISOString()}
                        title={date.toLocaleString()}
                        className="mt-1 block text-xs text-muted-foreground"
                      >
                        {formatDistanceToNow(date, { addSuffix: true })}
                      </time>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {recent.length > 5 && (
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="profile-activity-list"
            className="mt-5 h-10 w-full border-t pt-3 text-muted-foreground"
          >
            {t(
              expanded
                ? "userProfile.showLessActivity"
                : "userProfile.showAllActivity",
            )}
          </Button>
        )}
      </section>
    </aside>
  );
}
