import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/common/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import { useTranslations } from "@/common/hooks/use-translations";
import { toast } from "sonner";

interface CommitMetadataProps {
  sha: string;
  message: string;
  author: { name: string; email: string; date: string };
  stats: { additions: number; deletions: number; total: number };
  fileCount: number;
}

export function CommitMetadata({
  sha,
  message,
  author,
  stats,
  fileCount,
}: CommitMetadataProps) {
  const { t } = useTranslations();
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageParts = message.split("\n");
  const firstLine = messageParts[0];
  const extendedMessage =
    messageParts.length > 1 ? messageParts.slice(1).join("\n").trim() : null;
  const commitDate = new Date(author.date);
  const relativeTime = formatDistanceToNow(commitDate, { addSuffix: true });
  const exactTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(commitDate);
  const shortSha = sha.substring(0, 7);

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  const handleCopySha = async () => {
    try {
      await navigator.clipboard.writeText(sha);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("common.errors.generic"));
    }
  };

  return (
    <header className="space-y-3 p-4" data-testid="commit-metadata">
      <div className="min-w-0 space-y-2">
        <h1 className="text-xl font-semibold leading-7 tracking-tight">
          {firstLine}
        </h1>
        {extendedMessage && (
          <p className="whitespace-pre-wrap border-l-2 border-border pl-3 text-sm leading-5 text-muted-foreground">
            {extendedMessage}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
        <span
          className="max-w-full truncate font-medium text-foreground"
          title={author.email}
        >
          {author.name}
        </span>
        <span aria-hidden="true">·</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <time
              dateTime={author.date}
              tabIndex={0}
              aria-label={exactTime}
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {relativeTime}
            </time>
          </TooltipTrigger>
          <TooltipContent>{exactTime}</TooltipContent>
        </Tooltip>
        <span aria-hidden="true">·</span>
        <div className="inline-flex h-7 items-center rounded-md bg-muted pl-2 text-foreground">
          <code>{shortSha}</code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => void handleCopySha()}
            aria-label={`${copied ? t("common.copied") : t("common.copy")} ${sha}`}
          >
            {copied ? (
              <Check className="size-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copied ? t("common.copied") : ""}
          </span>
        </div>
        <span aria-hidden="true">·</span>
        <span>
          {fileCount} {fileCount === 1 ? t("commits.file") : t("commits.files")}
        </span>
        <span className="text-green-700 dark:text-green-400">
          {t("commits.additions", { count: stats.additions })}
        </span>
        <span className="text-red-700 dark:text-red-400">
          {t("commits.deletions", { count: stats.deletions })}
        </span>
      </div>
    </header>
  );
}
