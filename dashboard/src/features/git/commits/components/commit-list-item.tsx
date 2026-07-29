import { Link } from "@tanstack/react-router";
import { GitCommit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/common/lib/utils/utils";
import type { MouseEvent } from "react";

interface CommitListItemProps {
  commit: {
    sha: string;
    shortSha?: string | null;
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  ledgerId: string;
  isSelected?: boolean;
  onSelect?: (sha: string) => void;
}

export function CommitListItem({
  commit,
  ledgerId,
  isSelected = false,
  onSelect,
}: CommitListItemProps) {
  const [ledgerOwner, ledgerName] = ledgerId.split("/");

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      onSelect?.(commit.sha);
    }
  };

  return (
    <Link
      to="/ledger/$ledgerOwner/$ledgerName/commit/$commitSha"
      params={{ ledgerOwner, ledgerName, commitSha: commit.sha }}
      aria-current={isSelected ? "page" : undefined}
      onClick={handleClick}
      className={cn(
        "group flex h-[60px] min-w-0 items-center gap-2.5 border-l-2 px-3 py-2 transition-colors",
        "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected
          ? "border-l-primary bg-accent/80 hover:bg-accent"
          : "border-l-transparent hover:bg-muted/60",
      )}
      data-testid="commit-list-item"
    >
      <GitCommit
        className={cn(
          "size-4 shrink-0",
          isSelected
            ? "text-accent-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-5">
          {commit.message.split("\n")[0]}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
          <span className="min-w-0 truncate">{commit.author.name}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 font-mono">
            {commit.shortSha || commit.sha.substring(0, 7)}
          </span>
          <span aria-hidden="true">·</span>
          <time
            dateTime={commit.author.date}
            className="min-w-0 truncate"
            title={new Date(commit.author.date).toLocaleString()}
          >
            {formatDistanceToNow(new Date(commit.author.date), {
              addSuffix: true,
            })}
          </time>
        </div>
      </div>
    </Link>
  );
}
