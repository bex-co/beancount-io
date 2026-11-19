import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatPercent } from "@/common/hooks/use-format-percent";
import { useLedgerNavigateToAccount } from "@/common/hooks/use-ledger";
import { formatLedgerDate } from "@/common/lib/format/ledger-date";
import { cn } from "@/common/lib/utils/utils";
import {
  type AccountBalanceRow,
  type CurrencyAmount,
  buildAccountBalanceRows,
  buildDistributionData,
  sumSideBalance,
} from "../lib/overview-utils";
import {
  parseConcreteTimeFilter,
  type FiscalYearEnd,
} from "../../export/reporting-period";
import { formatStatementDate } from "../../export/date";
import { AccountName } from "@/common/components/account-name";
import { FormattedAmounts } from "./formatted-amounts";

type Side = AccountBalanceRow["kind"];

/** How many of each side's largest accounts are listed; the rest are counted. */
const ROWS: Record<Side, number> = { asset: 5, liability: 3 };

/**
 * Each listed account's tone of its side's color, largest first. One hue per
 * side keeps the bar a single quantity — what the side is made of — rather
 * than six unrelated categories; the unlisted rest is grey.
 */
const TONES = [1, 0.72, 0.52, 0.38, 0.28];

const SIDE_COLOR: Record<Side, string> = {
  asset: "var(--chart-1)",
  liability: "var(--chart-5)",
};

/**
 * Each account's share of its side, in the one unit the distribution model
 * chooses — the same rule the charts follow, so a share never adds vacation
 * hours to dollars. An account without that unit has no share.
 */
function sharesByAccount(
  input: unknown,
  inverse: boolean,
  preferredCurrency: string,
): Map<string, number> {
  const { items } = buildDistributionData(input, inverse, preferredCurrency);
  const total = items.reduce((sum, item) => sum + Math.abs(item.value), 0);
  if (total === 0) return new Map();
  return new Map(
    items.map((item) => [item.name, Math.abs(item.value) / total]),
  );
}

/**
 * One side of the balance sheet: its name and total, a bar of what it is made
 * of, then its largest accounts in order, each with its share of the side.
 * Shares are of this side only, which its heading says; a side of a single
 * account is all of itself and draws no bar.
 */
function BalanceSide({
  kind,
  rows,
  total,
  shares,
  active,
  onActive,
  className,
}: {
  kind: Side;
  rows: AccountBalanceRow[];
  total: CurrencyAmount[];
  shares: Map<string, number>;
  /** The account the reader is pointing at, lit in the bar and its row. */
  active: string | null;
  onActive: (account: string | null) => void;
  className?: string;
}) {
  const { t } = useTranslations();
  const navigateToAccount = useLedgerNavigateToAccount();
  const headingId = useId();
  const listed = rows.slice(0, ROWS[kind]);
  const unlisted = rows.length - listed.length;
  const charted = shares.size > 1;
  const color = SIDE_COLOR[kind];
  const toneOf = (index: number) => TONES[Math.min(index, TONES.length - 1)];
  const listedShare = listed.reduce(
    (sum, row) => sum + (shares.get(row.account) ?? 0),
    0,
  );
  const rest = charted ? Math.max(0, 1 - listedShare) : 0;
  // The language's digits and percent sign, as every share is written.
  const formatPercent = useFormatPercent();
  const dim = (account: string) => active !== null && active !== account;

  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      {/* Laid out as a row is, so the total stands over the amounts it
          adds up rather than over the shares. */}
      <div className="flex items-baseline gap-3 px-5 pt-4 pb-3">
        <h3
          id={headingId}
          className="flex-1 text-sm font-semibold text-foreground"
        >
          {kind === "asset" ? t("common.assets") : t("common.liabilities")}
        </h3>
        <span className="shrink-0 text-right">
          <FormattedAmounts
            amounts={total.slice(0, 1)}
            className="block text-sm font-semibold"
          />
          {/* Units without a price stay apart from the total, and quieter. */}
          {total.length > 1 && (
            <FormattedAmounts
              amounts={total.slice(1)}
              className="mt-0.5 block text-xs text-muted-foreground"
            />
          )}
        </span>
        {charted && <span aria-hidden="true" className="w-11 shrink-0" />}
      </div>

      {charted && (
        // The rows below are this bar in words, so it is not read twice.
        <div
          aria-hidden="true"
          className="mx-5 mb-2 flex h-2 gap-0.5 overflow-hidden rounded-full"
        >
          {listed.map((row, index) => {
            const share = shares.get(row.account);
            if (share === undefined) return null;
            return (
              <span
                key={row.account}
                className="h-full min-w-[3px] transition-opacity duration-200"
                style={{
                  flex: `${share} 1 0`,
                  background: color,
                  opacity: toneOf(index) * (dim(row.account) ? 0.35 : 1),
                }}
                onMouseEnter={() => onActive(row.account)}
                onMouseLeave={() => onActive(null)}
              />
            );
          })}
          {rest > 0.0005 && (
            <span
              className={cn(
                "h-full min-w-[3px] bg-muted-foreground/25 transition-opacity duration-200",
                active !== null && "opacity-40",
              )}
              style={{ flex: `${rest} 1 0` }}
            />
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-muted-foreground">
          {kind === "liability"
            ? t("page.overview.nothingOwed")
            : t("page.accounts.noAccountsFound")}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {listed.map((row, index) => {
            const share = shares.get(row.account);
            const swatch: CSSProperties = {
              background: color,
              opacity: toneOf(index),
            };
            return (
              <li key={row.account}>
                <button
                  type="button"
                  // The whole name, where a narrow row cuts it short.
                  title={row.account}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]",
                    active === row.account && "bg-muted/40",
                  )}
                  onMouseEnter={() => onActive(row.account)}
                  onMouseLeave={() => onActive(null)}
                  onFocus={() => onActive(row.account)}
                  onBlur={() => onActive(null)}
                  onClick={() => navigateToAccount(row.account)}
                >
                  {charted && (
                    // The row's key to its part of the bar.
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-[2px]",
                        share === undefined && "invisible",
                      )}
                      style={swatch}
                    />
                  )}
                  <AccountName account={row.account} className="flex-1" />
                  {/* The side's total names the unit; a row repeats it only
                      for an amount in another one. */}
                  <FormattedAmounts
                    amounts={row.amounts}
                    quietUnit={total[0]?.currency}
                    className="shrink-0 text-right text-sm"
                  />
                  {charted && (
                    <span className="w-11 shrink-0 text-right text-xs leading-5 text-muted-foreground tabular-nums">
                      {share === undefined ? "" : formatPercent(share, 1, 0)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {unlisted > 0 && (
        <p className="px-5 pt-2 pb-1 text-xs text-muted-foreground">
          {t("page.overview.moreAccounts", { count: unlisted })}
        </p>
      )}
    </section>
  );
}

/**
 * The balance sheet in brief: what is owned and what is owed, each as a
 * total and its largest accounts. Given `summary` (the net worth those two
 * make), it heads the card and the two sides sit abreast beneath it, so the
 * figure and its parts read as one statement; the section then names the day.
 */
export function AccountBalancesCard({
  assets,
  liabilities,
  primaryCurrency,
  invertLiabilities,
  ledgerOwner,
  ledgerName,
  time,
  fiscalYearEnd,
  asOf,
  pending = false,
  summary,
}: {
  /** The net worth the two sides make, set at the head of the card. */
  summary?: ReactNode;
  /** The active Time filter: balances are then as of its last day. */
  time?: string;
  /**
   * The day these balances are for, shown beside the title as the Net Worth
   * card shows its own; it stands in for the period sentence.
   */
  asOf?: string;
  /** Balances for a newly chosen day are still on their way. */
  pending?: boolean;
  fiscalYearEnd?: FiscalYearEnd;
  assets?: unknown;
  liabilities?: unknown;
  primaryCurrency: string;
  invertLiabilities: boolean;
  ledgerOwner: string;
  ledgerName: string;
}) {
  const { t, i18n } = useTranslations();
  const [active, setActive] = useState<string | null>(null);
  // Under a Time filter these are period-end balances, which the all-time
  // Accounts directory cannot show; the Balance Sheet can.
  const filtered = Boolean(time?.trim());
  const periodEnd = filtered
    ? (parseConcreteTimeFilter(time!, fiscalYearEnd)?.endDate ?? null)
    : null;
  // Unfiltered balances are simply today's; only a period needs saying.
  const description =
    !filtered || asOf
      ? null
      : periodEnd
        ? t("page.overview.accountsDescriptionAt", {
            date: formatStatementDate(periodEnd, i18n.language),
          })
        : t("page.overview.accountsDescriptionPeriodEnd");
  const rows = buildAccountBalanceRows({
    assets,
    liabilities,
    preferredCurrency: primaryCurrency,
    invertLiabilities,
  });
  const sides = (["asset", "liability"] as const).map((kind) => {
    const input = kind === "asset" ? assets : liabilities;
    return {
      kind,
      rows: rows.filter((row) => row.kind === kind),
      total: sumSideBalance(
        input,
        kind === "liability" && invertLiabilities,
        primaryCurrency,
      ),
      shares: sharesByAccount(input, kind === "liability", primaryCurrency),
    };
  });
  const accountsLink = filtered
    ? "/ledger/$ledgerOwner/$ledgerName/balance-sheet"
    : "/ledger/$ledgerOwner/$ledgerName/accounts";
  // Abreast only beneath the figure, where the section is wide enough.
  const abreast = summary !== undefined;

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      {abreast ? (
        <div className="px-5 pt-5 pb-5">{summary}</div>
      ) : (
        <CardHeader className="pt-5 pb-1">
          <CardTitle className="flex flex-wrap items-baseline gap-x-2">
            {t("page.accounts.accounts")}
            {asOf && (
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {formatLedgerDate(asOf, i18n.language, {
                  dateStyle: "medium",
                }) ?? asOf}
              </span>
            )}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}

      {pending ? (
        // The rows' own shape, held while the chosen day's balances load.
        <div aria-busy="true" className="divide-y border-t">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-5 py-3">
              <span className="block h-4 w-44 flex-1 animate-pulse rounded bg-muted" />
              <span className="block h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid flex-1 content-start border-t pb-3",
            abreast && "@3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
          )}
        >
          {sides.map((side, index) => (
            <BalanceSide
              key={side.kind}
              {...side}
              active={active}
              onActive={setActive}
              className={cn(
                index > 0 && "mt-2 border-t",
                index > 0 &&
                  abreast &&
                  "@3xl:mt-0 @3xl:border-t-0 @3xl:border-l",
              )}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end border-t px-3 py-2">
        <Button variant="ghost" size="sm" asChild>
          {/* The card's one way on, saying where it goes. */}
          <Link to={accountsLink} params={{ ledgerOwner, ledgerName }}>
            {filtered
              ? t("page.overview.viewPeriodBalanceSheet")
              : t("page.overview.viewAllAccounts")}
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
