import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Globe2, LockKeyhole, Star } from "lucide-react";
import { useFormatRelativeTime } from "@/common/hooks/use-date-locale";
import { useTranslations } from "@/common/hooks/use-translations";

interface RepositoryListItemProps {
  name: string;
  fullName: string;
  description?: string | null;
  isPrivate: boolean;
  updatedAt: Date | string;
  starsCount?: number | null;
  ownerUsername: string;
}

export function RepositoryListItem({
  name,
  fullName,
  description,
  isPrivate,
  updatedAt,
  starsCount,
  ownerUsername,
}: RepositoryListItemProps) {
  const { t } = useTranslations();
  const formatRelativeTime = useFormatRelativeTime();
  const ledgerOwner = fullName.split("/")[0] || ownerUsername;
  const date = new Date(updatedAt);
  const hasDate = !Number.isNaN(date.getTime());
  const colors = [
    "bg-primary/8 text-primary",
    "bg-chart-7/8 text-chart-7",
    "bg-chart-3/10 text-foreground",
    "bg-chart-6/8 text-chart-6",
  ];
  const colorIndex =
    Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    colors.length;

  return (
    <Link
      to="/ledger/$ledgerOwner/$ledgerName"
      params={{ ledgerOwner, ledgerName: name }}
      className="group flex h-full min-w-0 flex-col rounded-xl border bg-card p-5 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <span
          aria-hidden="true"
          className={`flex size-11 items-center justify-center rounded-lg text-sm font-semibold tracking-wide ${colors[colorIndex]}`}
        >
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          {isPrivate ? (
            <LockKeyhole aria-hidden="true" className="size-3" />
          ) : (
            <Globe2 aria-hidden="true" className="size-3" />
          )}
          {isPrivate ? t("userProfile.private") : t("userProfile.public")}
        </span>
      </div>
      <h3 className="break-words text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
        {name}
      </h3>
      <p className="mt-2 mb-5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {description || t("userProfile.ledgerDescription")}
      </p>
      <div className="mt-auto flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
        {hasDate && (
          <span>
            {t("userProfile.updated")}{" "}
            <time dateTime={date.toISOString()} title={date.toLocaleString()}>
              {formatRelativeTime(date)}
            </time>
          </span>
        )}
        {starsCount != null && starsCount > 0 && (
          <span className="flex items-center gap-1">
            <Star aria-hidden="true" className="size-3" />
            {starsCount}
          </span>
        )}
        <ArrowUpRight
          aria-hidden="true"
          className="ms-auto size-4 shrink-0 text-primary"
        />
      </div>
    </Link>
  );
}
