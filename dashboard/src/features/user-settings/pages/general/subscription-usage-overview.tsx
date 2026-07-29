import { Bot, BookOpen } from "lucide-react";
import { type UserLimits } from "@/common/hooks/use-user-limits";

export function UsageOverview({
  limits,
  aiCfoTokensUsed,
  aiCfoTokensMax,
  t,
}: {
  limits: UserLimits;
  aiCfoTokensUsed: number;
  aiCfoTokensMax: number;
  t: (key: string, params?: Record<string, string>) => string;
}) {
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

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">
        {t("userSettings.usage")}
      </h4>

      {/* AI Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("userSettings.aiCfoUsage")}
            </span>
          </div>
          <span className="text-muted-foreground">
            {isAiUnlimited
              ? t("userSettings.aiCfoUsageUnlimited", {
                  used: aiCfoTokensUsed.toLocaleString(),
                })
              : t("userSettings.aiCfoUsageCount", {
                  used: aiCfoTokensUsed.toLocaleString(),
                  max: aiCfoTokensMax.toLocaleString(),
                })}
          </span>
        </div>
        {!isAiUnlimited && (
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
