import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { DialogFooter } from "@/common/components/ui/dialog";
import {
  LEGACY_PRICE_IDS,
  planForPrice,
  type BillingCycle,
} from "./stripe-config";
import {
  nextChargeLine,
  planLabel,
  type Preview,
  type Translate,
} from "./plan-change-format";
import { useBillingDateFormat, useMoneyFormat } from "./use-money-format";
import { useFormatCount } from "@/common/hooks/use-format-count";

const LIMIT_LABEL_KEYS: Record<string, string> = {
  maxLedgers: "userSettings.ledgers",
  maxCollaboratorsPerLedger: "userSettings.planChangeLimitCollaborators",
  aiCfoTokensMax: "userSettings.planChangeLimitAiTokens",
  maxDirectives: "userSettings.planChangeLimitDirectives",
};

const WARNING_TEXT = "text-amber-700 dark:text-amber-400";

/**
 * What every change sheet says about the state a choice replaces: a pending
 * scheduled change, a pending cancellation, a legacy price that ends.
 */
export function PendingChangeNotes({
  planChange,
  t,
}: {
  planChange: Preview;
  t: Translate;
}) {
  const formatDate = useBillingDateFormat();
  const replaced = planChange.replacesScheduledChange;
  const replacedPlan = replaced ? planForPrice(replaced.priceId) : null;
  const notes = [
    replaced && replacedPlan
      ? t("userSettings.planChangeReplacesScheduled", {
          plan: planLabel(t, replacedPlan.tier, replacedPlan.cycle),
          date: formatDate(replaced.effectiveAt),
        })
      : null,
    planChange.withdrawsCancellation
      ? t("userSettings.planChangeWithdrawsCancellation")
      : null,
    planChange.currentPriceId && LEGACY_PRICE_IDS.has(planChange.currentPriceId)
      ? t("userSettings.planChangeLegacyEnds")
      : null,
  ].filter((note): note is string => note !== null);
  if (notes.length === 0) return null;
  return (
    <ul
      className="space-y-1 rounded-md bg-muted/50 p-2 text-xs"
      data-testid="plan-change-notes"
    >
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

export type SplitChoice = "now" | "later";

/**
 * The confirm step for a change that waits for the end of the paid period
 * (PRFAQ005 question 15): when it starts, that nothing is due today, each
 * limit the server reports against current usage, the plan features that
 * go, and — for a higher tier while leaving yearly — the choice between that
 * tier now on yearly and monthly from the renewal date.
 */
export function ScheduledChangeBody({
  planChange,
  alternative,
  splitChoice,
  onSplitChoice,
  currentName,
  targetName,
  targetCycle,
  lostFeatureKeys,
  ledgersUsed,
  busy,
  t,
  onConfirm,
  onRetryAlternative,
  onKeep,
}: {
  planChange: Preview;
  /** For a split: the higher tier now, on yearly, once priced or failed. */
  alternative: { preview: Preview | null; failed: boolean };
  splitChoice: SplitChoice;
  onSplitChoice: (choice: SplitChoice) => void;
  currentName: string;
  targetName: string;
  targetCycle: BillingCycle;
  /** Pricing-table features the target plan does not include. */
  lostFeatureKeys: string[];
  ledgersUsed: number | null;
  busy: boolean;
  t: Translate;
  onConfirm: (chosen: Preview) => void;
  onRetryAlternative: () => void;
  onKeep: () => void;
}) {
  const formatMoney = useMoneyFormat();
  const formatDate = useBillingDateFormat();
  const formatCount = useFormatCount();
  const radioName = useId();

  const date = planChange.effectiveAt ? formatDate(planChange.effectiveAt) : "";
  const isSplit = planChange.kind === "SPLIT";
  const now = isSplit && splitChoice === "now" ? alternative.preview : null;
  const rows = planChange.limitChanges.filter(
    (change) => change.from !== change.to && LIMIT_LABEL_KEYS[change.limit],
  );
  const limitValue = (value: number) =>
    value === -1 ? t("userSettings.unlimited") : formatCount(value);
  const ledgers = rows.find((row) => row.limit === "maxLedgers");
  const overLedgers =
    !!ledgers &&
    ledgers.to !== -1 &&
    ledgersUsed !== null &&
    ledgersUsed > ledgers.to;

  return (
    <div className="space-y-4" data-testid="plan-change-scheduled">
      {!now && (
        <div className="space-y-1 text-sm">
          <p>
            {t("userSettings.planChangeStartsOn", { date, plan: currentName })}
          </p>
          <p className="text-muted-foreground">
            {t("userSettings.planChangeNothingToday")}{" "}
            {nextChargeLine(
              t,
              formatMoney,
              formatDate,
              planChange,
              targetCycle,
            )}
          </p>
        </div>
      )}

      <PendingChangeNotes planChange={planChange} t={t} />

      {!now && rows.length > 0 && (
        <div>
          <p className="text-xs font-semibold">
            {t("userSettings.planChangeWhatChanges", { date })}
          </p>
          <ul className="mt-1 space-y-1 text-xs">
            {rows.map((row) => {
              const over = row === ledgers && overLedgers;
              return (
                <li
                  key={row.limit}
                  className="flex items-center justify-between gap-2"
                >
                  <div>{t(LIMIT_LABEL_KEYS[row.limit])}</div>
                  <div className="flex items-center gap-2 tabular-nums">
                    {limitValue(row.from)} → {limitValue(row.to)}
                    {row === ledgers && ledgersUsed !== null && (
                      <div
                        className={
                          over
                            ? `flex items-center gap-1 ${WARNING_TEXT}`
                            : "text-muted-foreground"
                        }
                      >
                        {t("userSettings.planChangeYouHave", {
                          count: formatCount(ledgersUsed),
                        })}
                        {over && (
                          <AlertTriangle aria-hidden className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!now && lostFeatureKeys.length > 0 && (
        <div>
          <p className="text-xs font-semibold">
            {t("userSettings.planChangeFeaturesEnd")}
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
            {lostFeatureKeys.map((labelKey) => (
              <li key={labelKey}>{t(labelKey)}</li>
            ))}
          </ul>
        </div>
      )}

      {!now && overLedgers && (
        <p
          role="note"
          className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs"
        >
          <AlertTriangle
            aria-hidden
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${WARNING_TEXT}`}
          />
          {t("userSettings.planChangeOverLimit", {
            max: formatCount(ledgers.to),
          })}
        </p>
      )}

      {isSplit && (
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1">
            {t("userSettings.planChangeSplitIntro", { plan: targetName, date })}
          </legend>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name={radioName}
              checked={splitChoice === "now"}
              disabled={!alternative.preview}
              onChange={() => onSplitChoice("now")}
            />
            <span>
              {alternative.preview
                ? t("userSettings.planChangeSplitNow", {
                    plan: targetName,
                    amount: formatMoney(
                      alternative.preview.amountDueToday,
                      alternative.preview.currency,
                    ),
                  })
                : alternative.failed
                  ? t("userSettings.planChangePreviewFailed")
                  : t("userSettings.planChangePreviewing")}
            </span>
          </label>
          {alternative.failed && (
            <Button size="sm" variant="outline" onClick={onRetryAlternative}>
              {t("common.tryAgain")}
            </Button>
          )}
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name={radioName}
              checked={splitChoice === "later"}
              onChange={() => onSplitChoice("later")}
            />
            <span>
              {t("userSettings.planChangeSplitLater", {
                plan: targetName,
                date,
              })}
            </span>
          </label>
        </fieldset>
      )}

      <DialogFooter className="flex-col gap-2 sm:flex-row">
        <Button disabled={busy} onClick={() => onConfirm(now ?? planChange)}>
          {now
            ? t("userSettings.planChangePayAndSwitch", {
                amount: formatMoney(now.amountDueToday, now.currency),
              })
            : t(
                planChange.kind === "DOWNGRADE"
                  ? "userSettings.planChangeScheduleDowngrade"
                  : "userSettings.planChangeScheduleSwitch",
              )}
        </Button>
        <Button variant="outline" onClick={onKeep}>
          {t("userSettings.planChangeKeep", { plan: currentName })}
        </Button>
      </DialogFooter>
    </div>
  );
}
