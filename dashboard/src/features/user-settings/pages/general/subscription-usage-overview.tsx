import { useEffect, useRef } from "react";
import { AlertCircle, Bot, BookOpen } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { type UserLimits } from "@/common/hooks/use-user-limits";
import { useQuotaNumberFormat } from "./use-quota-number-format";

export function UsageOverview({
  limits,
  aiCfoTokensUsed,
  aiCfoTokensMax,
  aiUsageUnavailable = null,
  t,
}: {
  limits: UserLimits;
  aiCfoTokensUsed: number;
  aiCfoTokensMax: number;
  /**
   * The usage read failed and none succeeded before: there are no counts to
   * show, only a retry. Zeros here would read as an exhausted quota (w4/312).
   */
  aiUsageUnavailable?: { retrying: boolean; onRetry: () => void } | null;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  // App-locale counts; `toLocaleString()` would follow the browser locale.
  const formatCount = useQuotaNumberFormat();
  const { ledgersUsed, ledgersMax } = limits;
  const isAiUnlimited = aiCfoTokensMax === -1;
  const isLedgersUnlimited = ledgersMax === -1;

  const aiPercentage = isAiUnlimited
    ? 0
    : Math.min((aiCfoTokensUsed / aiCfoTokensMax) * 100, 100);
  const isAiAtLimit = !isAiUnlimited && aiCfoTokensUsed >= aiCfoTokensMax;

  const ledgerPercentage = isLedgersUnlimited
    ? 0
    : Math.min((ledgersUsed / ledgersMax) * 100, 100);
  const isLedgerAtLimit = !isLedgersUnlimited && ledgersUsed >= ledgersMax;

  // The busy retry is disabled, and the browser drops its focus. Another
  // failure hands it back to the retry (`useQueryRetry`); a success replaces
  // the retry, so hand focus to the usage that replaced it.
  const aiTokens = useRef<HTMLDivElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const retryHadFocus = useRef(false);
  const retrying = aiUsageUnavailable?.retrying ?? false;
  useEffect(() => {
    if (retrying || !retryHadFocus.current) return;
    retryHadFocus.current = false;
    if (document.activeElement !== document.body) return;
    aiTokens.current?.focus();
  }, [retrying]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        {t("userSettings.usage")}
      </h3>

      {/* AI Tokens */}
      <div ref={aiTokens} tabIndex={-1} className="space-y-2 outline-none">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("userSettings.aiCfoUsage")}
            </span>
          </div>
          {!aiUsageUnavailable && (
            <span className="text-muted-foreground">
              {isAiUnlimited
                ? t("userSettings.aiCfoUsageUnlimited", {
                    used: formatCount(aiCfoTokensUsed),
                  })
                : t("userSettings.aiCfoUsageCount", {
                    used: formatCount(aiCfoTokensUsed),
                    max: formatCount(aiCfoTokensMax),
                  })}
            </span>
          )}
        </div>
        {aiUsageUnavailable ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("userSettings.aiCfoUsageUnavailable")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              ref={retryButton}
              onClick={() => {
                retryHadFocus.current =
                  document.activeElement === retryButton.current;
                aiUsageUnavailable.onRetry();
              }}
              loading={retrying}
            >
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : (
          !isAiUnlimited && (
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  isAiAtLimit
                    ? "bg-destructive"
                    : aiPercentage > 80
                      ? "bg-yellow-500"
                      : "bg-primary"
                }`}
                style={{ width: `${aiPercentage}%` }}
              />
            </div>
          )
        )}
      </div>

      {/* Ledgers — only meaningful when max > 1 (binary 0/1 adds no signal) */}
      {(isLedgersUnlimited || ledgersMax > 1) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t("userSettings.ledgers")}
              </span>
            </div>
            <span className="text-muted-foreground">
              {isLedgersUnlimited
                ? t("userSettings.unlimited")
                : t("userSettings.ledgerUsageCount", {
                    used: String(ledgersUsed),
                    max: String(ledgersMax),
                  })}
            </span>
          </div>
          {!isLedgersUnlimited && (
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  isLedgerAtLimit
                    ? "bg-destructive"
                    : ledgerPercentage > 80
                      ? "bg-yellow-500"
                      : "bg-primary"
                }`}
                style={{ width: `${ledgerPercentage}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
