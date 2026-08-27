import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { useTranslations } from "@/common/hooks/use-translations";
import { GetLatestLedgerCommitDocument } from "@/graphql/definitions";

function OutOfDateIndicatorInner({ ledgerId }: { ledgerId: string }) {
  const clearCache = useApolloCacheClear();
  const { t } = useTranslations();
  const [localSha, setLocalSha] = useState<string | null>(null);

  const { data } = useQuery(GetLatestLedgerCommitDocument, {
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
        >
          <RefreshCw className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500" />
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
