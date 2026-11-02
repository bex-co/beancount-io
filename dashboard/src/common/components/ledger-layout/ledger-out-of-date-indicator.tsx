import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery, useReactiveVar } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import {
  cacheClears,
  useApolloCacheClear,
} from "@/common/hooks/use-apollo-cache";
import { useTranslations } from "@/common/hooks/use-translations";
import { GetLatestLedgerCommitDocument } from "@/graphql/definitions";

function OutOfDateIndicatorInner({ ledgerId }: { ledgerId: string }) {
  const clearCache = useApolloCacheClear();
  const { t } = useTranslations();
  const [localSha, setLocalSha] = useState<string | null>(null);

  const clears = useReactiveVar(cacheClears);
  const clearsAtMount = useRef(clears);

  const { data, refetch } = useQuery(GetLatestLedgerCommitDocument, {
    variables: { ledgerId },
    pollInterval: 30 * 1000,
  });

  const remoteSha = data?.getLatestLedgerCommit?.sha ?? null;

  useEffect(() => {
    if (!remoteSha) return;
    // setTimeout defers setState so it is not synchronous within the effect body
    const id = setTimeout(() => {
      setLocalSha((prev) => (prev === null ? remoteSha : prev));
    }, 0);
    return () => clearTimeout(id);
  }, [remoteSha]);

  // Every dashboard write ends in a cache clear that refetches the page, so
  // the head it lands on is what the page now shows — not someone else's
  // change. Baseline on it; a later commit from elsewhere still differs.
  useEffect(() => {
    if (clears === clearsAtMount.current) return;
    let current = true;
    refetch().then(
      (result) => {
        const sha = result.data?.getLatestLedgerCommit?.sha;
        if (current && sha) setLocalSha(sha);
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, [clears, refetch]);

  const isOutOfDate =
    localSha !== null && remoteSha !== null && localSha !== remoteSha;

  if (!isOutOfDate) return null;

  const handleClick = () => {
    setLocalSha(remoteSha);
    clearCache();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleClick}
          className="relative"
          // The tooltip only describes the button; the action needs a name
          // of its own for screen readers and voice control (w4/236).
          aria-label={t("common.outOfDateRefresh")}
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("common.outOfDateRefresh")}</TooltipContent>
    </Tooltip>
  );
}

export function LedgerOutOfDateIndicator({ ledgerId }: { ledgerId: string }) {
  return (
    <ClientOnly>
      {/* key forces a remount on ledger switch so localSha resets instead of
          comparing the new ledger's remoteSha against the old ledger's sha */}
      <OutOfDateIndicatorInner key={ledgerId} ledgerId={ledgerId} />
    </ClientOnly>
  );
}
