import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import type { CurrencySuggestion } from "../lib/currency-suggestion";

/**
 * Where the preselected currency came from, and the time zone's currency as
 * a one-tap alternative when it differs (ADR026). The label shows only while
 * the suggestion is still the value; the fallback USD carries none.
 */
export function CurrencySuggestionHint({
  suggestion,
  value,
  chosen,
  onPick,
}: {
  suggestion: CurrencySuggestion;
  value: string;
  chosen: boolean;
  onPick: (currency: string) => void;
}) {
  const { t } = useTranslations();
  const current = value.toUpperCase();
  const label =
    !chosen && current === suggestion.currency
      ? suggestion.source === "saved"
        ? t("page.dashboard.currencyFromSaved")
        : suggestion.source === "region"
          ? t("page.dashboard.currencyFromRegion")
          : null
      : null;
  const candidate =
    suggestion.timeZoneCandidate && current !== suggestion.timeZoneCandidate
      ? suggestion.timeZoneCandidate
      : null;
  if (!label && !candidate) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {label ? <span data-testid="ledger-currency-source">{label}</span> : null}
      {candidate ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          data-testid="ledger-currency-candidate"
          onClick={() => onPick(candidate)}
        >
          {t("page.dashboard.currencyUseTimeZone", { currency: candidate })}
        </Button>
      ) : null}
    </div>
  );
}
