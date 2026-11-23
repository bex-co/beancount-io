import { useId, useMemo, useState, type ReactNode } from "react";
import { AccountName } from "@/common/components/account-name";
import { ArrowRight } from "lucide-react";
import {
  type JournalDirectiveType,
  type JournalTransaction,
  isJournalBalance,
  isJournalTransaction,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatLedgerDate } from "@/common/lib/format/ledger-date";
import { directiveTypeLabel } from "@/common/lib/beancount/directive-type-label";
import {
  type TransactionSummary,
  summarizeTransaction,
} from "@/common/lib/beancount/transaction-summary";
import { Amount } from "@/common/components/amount";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import {
  absDecimalNumber,
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import type { CurrencyAmount } from "@/common/lib/beancount/currency-amount";
import { Badge } from "@/common/components/ui/badge";
import { getClickableRowProps } from "@/common/components/clickable-row";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { cn } from "@/common/lib/utils/utils";
import { JournalDescription } from "./journal-description";
import { JournalMetadata } from "./journal-metadata";
import { displayableMetadataEntries } from "./journal-metadata-entries";
import { JournalPostings } from "./journal-postings";
import { JournalPostingToggle } from "./journal-posting-toggle";
import { useJournalEntryLabel } from "./journal-entry-label";
import { BalanceCheck } from "./journal-balance-check";
import { balanceRowTone } from "./journal-balance-tone";
import {
  type MoneyFlow,
  moneyFlow,
  shortAccountNames,
} from "./journal-money-flow";
import {
  type JournalRegister,
  type JournalTableItem,
  RegisterBalance,
  RegisterChange,
} from "./journal-register";

/** What the rows need to say how much moved: the ledger's own names. */
export type JournalMoney = {
  primaryCurrency: string;
  incomeRoot: string;
  expensesRoot: string;
  /** The Account filter in force: a row then shows that account's share. */
  accountFilter: string;
};

type Item = JournalTableItem;

/** A day as a heading: "Fri, Sep 8, 2017" in the reader's language. */
function formatDay(date: string, language: string): string {
  return (
    formatLedgerDate(date, language, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }) ?? date
  );
}

/**
 * How much a split entry moved, where no account type sums it up (a payroll
 * with its deductions, a trade with its cost): its larger side in the
 * operating currency, or else in the first posting's unit. A size, so no
 * sign and no money-in colour.
 */
function grossAmounts(
  transaction: JournalTransaction,
  currency: string,
): CurrencyAmount[] {
  const side = (unit: string): CurrencyAmount | null => {
    const up: string[] = [];
    const down: string[] = [];
    for (const posting of transaction.postings ?? []) {
      if (posting.units?.currency !== unit) continue;
      const exact = parseDecimalNumber(String(posting.units.number));
      if (exact === null) continue;
      (exact.startsWith("-") ? down : up).push(exact);
    }
    if (!up.length && !down.length) return null;
    const ins = up.length ? sumDecimalNumbers(up) : "0";
    const outs = down.length ? absDecimalNumber(sumDecimalNumbers(down)) : "0";
    const exact = Number(ins) >= Number(outs) ? ins : outs;
    return Number(exact) === 0
      ? null
      : { currency: unit, value: Number(exact), exact };
  };
  const first = transaction.postings?.[0]?.units?.currency;
  const amount = side(currency) ?? (first ? side(first) : null);
  return amount ? [amount] : [];
}

/**
 * What an entry brought in: its income postings, signed as money in. A
 * payroll carries salary and its deductions; what the reader earned is the
 * income, the same figure an income-only entry shows.
 */
function incomeAmounts(
  transaction: JournalTransaction,
  incomeRoot: string,
  currency: string,
): CurrencyAmount[] {
  const values = (transaction.postings ?? [])
    .filter(
      (posting) =>
        (posting.account === incomeRoot ||
          posting.account.startsWith(`${incomeRoot}:`)) &&
        posting.units?.currency === currency,
    )
    .map((posting) => parseDecimalNumber(String(posting.units.number)))
    .filter((value): value is string => value !== null);
  if (!values.length) return [];
  const exact = negateDecimalNumber(sumDecimalNumbers(values));
  return Number(exact) > 0 ? [{ currency, value: Number(exact), exact }] : [];
}

/**
 * One rule for every row: money in is "+" in the money-in colour, money out
 * is "−", and a move between the reader's own accounts (a transfer, a trade)
 * is its size, unsigned.
 */
export function TransactionAmount({
  summary,
  transaction,
  money,
  className,
  quietPrimaryOnPhone = false,
}: {
  summary: TransactionSummary;
  transaction: JournalTransaction;
  money: JournalMoney;
  className?: string;
  /**
   * Below `sm`, leave the ledger's own currency unnamed on screen (still
   * read out): a phone's line has room for the figure, not its code.
   */
  quietPrimaryOnPhone?: boolean;
}) {
  const { t } = useTranslations();
  const formatNumber = useFormatNumber();
  // A sale's proceeds, gain or loss, and fees tell different stories. Leave
  // them to the posting list, except when a filter gives the amount a scope.
  const reducesCostedPosition =
    !money.accountFilter &&
    transaction.postings?.some(
      (posting) =>
        posting.cost != null &&
        parseDecimalNumber(String(posting.units?.number))?.startsWith("-"),
    );
  let amounts = reducesCostedPosition ? [] : summary.amounts;
  // For income, expenses and account changes, the sign of each currency is
  // its direction. Transfers and gross amounts show only the size moved.
  let signed =
    Boolean(money.accountFilter) ||
    summary.kind === "income" ||
    summary.kind === "expense";
  if (!reducesCostedPosition && amounts.length === 0) {
    const earned = incomeAmounts(
      transaction,
      money.incomeRoot,
      money.primaryCurrency,
    );
    signed = earned.length > 0;
    amounts = signed
      ? earned
      : grossAmounts(transaction, money.primaryCurrency);
  }
  if (amounts.length === 0) {
    return (
      <span
        className={cn("text-xs font-medium text-muted-foreground", className)}
      >
        {t("journal.multiplePostings")}
      </span>
    );
  }
  return (
    <span
      className={cn("block space-y-0.5 font-medium tabular-nums", className)}
    >
      {amounts.map((amount) => {
        const value = amount.exact ?? String(amount.value);
        const shown = !signed && value.startsWith("-") ? value.slice(1) : value;
        const incoming = signed && amount.value > 0;
        return (
          <span
            key={amount.currency}
            className={cn(
              // On a phone a long commodity code may take a line of its own
              // rather than run into the postings toggle.
              "block sm:whitespace-nowrap",
              incoming && "text-chart-2",
            )}
          >
            <Amount>
              {incoming ? "+" : ""}
              {/* The currency's own minor units (4,500.00 USD), as the
                  Overview writes amounts. */}
              {formatNumber(shown, amount.currency, fractionDigitsOf(shown))}
              <span
                className={
                  quietPrimaryOnPhone
                    ? amount.currency === money.primaryCurrency
                      ? "max-sm:sr-only"
                      : // Another commodity is named under its figure on a
                        // phone, smaller, as a banking app sets it.
                        "max-sm:block max-sm:text-xs max-sm:font-normal max-sm:text-muted-foreground"
                    : undefined
                }
              >
                {" "}
                {amount.currency}
              </span>
            </Amount>
          </span>
        );
      })}
    </span>
  );
}

function DayEntryRows({
  item,
  position,
  money,
  showMetadata,
  showPostings,
  onEntryClick,
  ledgerOwner,
  ledgerName,
  register,
}: {
  item: Item;
  position: number;
  money: JournalMoney;
  showMetadata: boolean;
  showPostings: boolean;
  onEntryClick?: (
    entry: JournalDirectiveType,
    opener: HTMLElement | null,
  ) => void;
  ledgerOwner?: string;
  ledgerName?: string;
  register?: JournalRegister;
}) {
  const { t } = useTranslations();
  const directive = item.directive;
  const transaction = isJournalTransaction(directive) ? directive : null;
  const entryLabel = useJournalEntryLabel(directive);
  const postingsRegionId = useId();
  const [expanded, setExpanded] = useState(false);
  const summary = useMemo(
    () =>
      transaction
        ? summarizeTransaction({
            transaction,
            accountFilter: money.accountFilter,
            preferredCurrency: money.primaryCurrency,
            incomeRoot: money.incomeRoot,
            expensesRoot: money.expensesRoot,
          })
        : null,
    [money, transaction],
  );
  const postingsVisible = showPostings || expanded;
  const hasVisiblePostings =
    transaction !== null &&
    postingsVisible &&
    (transaction.postings?.length ?? 0) > 0;
  const hasVisibleMetadata =
    showMetadata && displayableMetadataEntries(directive).length > 0;

  const title = transaction
    ? transaction.payee?.trim() ||
      transaction.narration?.trim() ||
      t("journal.transaction")
    : directiveTypeLabel(directive.directive_type, t);
  const narration =
    transaction?.payee?.trim() && transaction.narration?.trim()
      ? transaction.narration.trim()
      : "";
  const accounts = summary?.accounts ?? [];
  const flow = useMemo(
    () =>
      transaction
        ? moneyFlow(transaction, {
            accountFilter: money.accountFilter,
            change: summary?.amounts[0]?.value,
            register,
            registerChange: item.change,
          })
        : null,
    [item.change, money.accountFilter, register, summary, transaction],
  );
  const [firstAccount, secondAccount] = flow?.accounts ?? [];
  const balance = isJournalBalance(directive) ? directive : null;
  const rowProps = onEntryClick
    ? getClickableRowProps<HTMLTableRowElement>(
        (event) => onEntryClick(directive, event.currentTarget),
        {
          className: "transition-colors",
          preserveTableSemantics: true,
        },
      )
    : { className: "" };

  return (
    <>
      <TableRow
        {...rowProps}
        className={cn(
          "border-b border-border/50",
          rowProps.className,
          // A balance assertion is a checkpoint: green where the ledger
          // matches the statement, red where it is off.
          balance ? balanceRowTone(balance) : "hover:bg-muted/30",
        )}
      >
        <TableCell className="py-0 pe-2 ps-4 align-top whitespace-normal sm:ps-5">
          <div className="flex py-3">
            <div className="min-w-0 flex-1">
              {/* On a phone the amount shares the name's line, so what the
                  entry was for has the row's whole width under both. */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  {onEntryClick ? (
                    // The entry's own name opens it; the whole row does too.
                    <button
                      type="button"
                      aria-label={t("journal.openEntryWithContext", {
                        entry: entryLabel,
                        position,
                      })}
                      className="-mx-1 min-h-6 rounded-sm px-1 text-start pointer-coarse:min-w-11 text-base leading-6 font-medium outline-none [overflow-wrap:anywhere] hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:-my-3 pointer-coarse:py-3 sm:text-[15px] sm:leading-5 sm:pointer-coarse:text-base sm:pointer-coarse:leading-6 forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEntryClick(directive, event.currentTarget);
                      }}
                    >
                      {title}
                    </button>
                  ) : (
                    <span className="text-base leading-6 font-medium sm:text-[15px] sm:leading-5 sm:pointer-coarse:text-base">
                      {title}
                    </span>
                  )}
                  {transaction && transaction.flag === "!" && (
                    <Badge variant="secondary">
                      {t("journal.pendingStatus")}
                    </Badge>
                  )}
                  {transaction &&
                    transaction.flag !== "*" &&
                    transaction.flag !== "!" && (
                      <Badge
                        variant="outline"
                        className="font-mono"
                        title={t("journal.otherTransactions")}
                      >
                        {transaction.flag}
                      </Badge>
                    )}
                  {transaction?.not_booked === true && (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      {t("journal.notBooked")}
                    </Badge>
                  )}
                </div>
                {balance?.amount ? (
                  <LedgerAmount
                    {...balance.amount}
                    tolerance={balance.tolerance}
                    className="min-w-0 text-end text-base leading-6 font-medium tabular-nums [overflow-wrap:anywhere] sm:hidden"
                  />
                ) : register && !balance ? (
                  // On an account's journal: what the entry did there, and
                  // under it where the account then stood, named.
                  <div className="shrink-0 space-y-0.5 text-end sm:hidden">
                    <RegisterChange
                      item={item}
                      register={register}
                      className="text-base leading-6"
                    />
                    <RegisterBalance
                      item={item}
                      labelClassName=""
                      className="text-xs text-muted-foreground"
                    />
                  </div>
                ) : (
                  summary &&
                  transaction && (
                    <TransactionAmount
                      summary={summary}
                      transaction={transaction}
                      money={money}
                      className="shrink-0 text-end text-base leading-6 sm:hidden"
                    />
                  )
                )}
              </div>
              {transaction ? (
                <TransactionDetails
                  narration={narration}
                  accounts={accounts}
                  flow={flow}
                  tags={transaction.tags}
                  links={transaction.links}
                />
              ) : balance ? (
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base leading-6 sm:text-sm sm:leading-5">
                  <AccountName
                    account={balance.account}
                    className="text-[13px] text-muted-foreground"
                  />
                  <BalanceCheck directive={balance} />
                </div>
              ) : (
                // Notes, prices, documents: their own words.
                <div className="mt-0.5 -mx-1 text-base text-muted-foreground sm:-mx-2 sm:text-sm">
                  <JournalDescription
                    directive={directive}
                    ledgerOwner={ledgerOwner}
                    ledgerName={ledgerName}
                  />
                </div>
              )}
            </div>
          </div>
        </TableCell>
        {/* Every cell stays a table cell: a hidden one gives up its column, and
            the cells after it slid into the wrong ones. Below a column's
            breakpoint its cell is empty and unpadded instead. */}
        <TableCell className="p-0 align-top text-[13px] text-muted-foreground xl:py-3 xl:pe-4">
          {/* Where it moved, in one line: from the account it left to the
              one it reached, as the ledger names them. */}
          {flow && (
            <span
              className="hidden min-w-0 items-center gap-1.5 leading-5 xl:flex"
              title={accounts.join("\n")}
            >
              <span className="min-w-0 truncate">{firstAccount}</span>
              {secondAccount && (
                <>
                  {flow.directed ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3 shrink-0 text-muted-foreground/70 rtl:-scale-x-100"
                    />
                  ) : (
                    " · "
                  )}
                  <span className="min-w-0 truncate">{secondAccount}</span>
                </>
              )}
              {flow.more > 0 && (
                <span className="shrink-0 whitespace-nowrap">+{flow.more}</span>
              )}
            </span>
          )}
        </TableCell>
        <TableCell className="p-0 text-end align-top text-[15px] leading-5 sm:py-3 sm:pe-2 sm:ps-2 sm:pointer-coarse:text-base sm:pointer-coarse:leading-6">
          {register && !balance ? (
            // On an account's journal: what the entry did there, and under
            // it where the account then stood, named, as a bank's app sets
            // a running balance.
            <div className="hidden space-y-0.5 sm:block">
              <RegisterChange item={item} register={register} />
              <RegisterBalance
                item={item}
                labelClassName=""
                className="text-[13px] text-muted-foreground"
              />
            </div>
          ) : (
            summary &&
            transaction && (
              <TransactionAmount
                summary={summary}
                transaction={transaction}
                money={money}
                className="hidden sm:block"
              />
            )
          )}
          {balance?.amount && (
            // The balance the statement gave, as asserted.
            <LedgerAmount
              {...balance.amount}
              tolerance={balance.tolerance}
              className="hidden font-medium tabular-nums sm:inline"
            />
          )}
        </TableCell>
        <TableCell className="py-2 pe-1 ps-0 align-top sm:pe-2">
          {transaction && (
            <div className="flex justify-end">
              <JournalPostingToggle
                directive={transaction}
                entry={entryLabel}
                position={position}
                controls={hasVisiblePostings ? postingsRegionId : undefined}
                onClick={() => {
                  if (!showPostings) setExpanded((open) => !open);
                }}
                expanded={postingsVisible}
                forcedOpen={showPostings}
                className="pointer-coarse:h-11 pointer-coarse:min-w-11"
              />
            </div>
          )}
        </TableCell>
      </TableRow>
      {(hasVisiblePostings || hasVisibleMetadata) && (
        <TableRow className="border-b border-border/50 hover:bg-transparent">
          <TableCell colSpan={4} className="p-0 whitespace-normal">
            {transaction && hasVisiblePostings && (
              <div id={postingsRegionId}>
                <JournalPostings
                  directive={transaction}
                  showPostings={postingsVisible}
                  ledgerOwner={ledgerOwner}
                  ledgerName={ledgerName}
                  compact
                />
              </div>
            )}
            <JournalMetadata
              directive={directive}
              showMetadata={showMetadata}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** Under the title: what it was for, then where it moved, then its tags. */
function TransactionDetails({
  narration,
  accounts,
  flow,
  tags,
  links,
}: {
  narration: string;
  accounts: string[];
  flow: MoneyFlow | null;
  tags: JournalTransaction["tags"];
  links: JournalTransaction["links"];
}) {
  const parts: ReactNode[] = [];
  if (narration) parts.push(<span key="n">{narration}</span>);
  // Below the wide layout the accounts have no column of their own.
  const moved = flow
    ? shortAccountNames(flow.accounts).join(
        flow.directed ? "\u00a0→ " : "\u00a0· ",
      )
    : "";
  const marks = [
    ...(tags ?? []).map((tag) => `#${tag}`),
    ...(links ?? []).map((link) => `^${link}`),
  ];
  if (!parts.length && !moved && !marks.length) return null;
  return (
    <p className="mt-0.5 text-base leading-6 text-muted-foreground [overflow-wrap:anywhere] sm:text-[13px] sm:leading-5 sm:pointer-coarse:text-[15px] sm:pointer-coarse:leading-6">
      {parts}
      {moved && (
        <span className="xl:hidden" title={accounts.join("\n")}>
          {parts.length > 0 && "\u00a0· "}
          <span dir="auto">
            {moved}
            {flow && flow.more > 0 && `\u00a0+${flow.more}`}
          </span>
        </span>
      )}
      {marks.length > 0 && (
        <span className="text-primary">
          {(parts.length > 0 || moved) && " "}
          {/* Each tag whole: "#trip-new-york-2025" never splits at a hyphen. */}
          {marks.map((mark, index) => (
            <span key={mark}>
              {index > 0 && " "}
              <span className="whitespace-nowrap">{mark}</span>
            </span>
          ))}
        </span>
      )}
    </p>
  );
}

/**
 * The journal as a ledger reads: the day once, as a heading, and that day's
 * entries under it. Each entry names who or what it was, what it was for and
 * where the money moved, with the amount at the right edge; its postings open
 * beneath it. One table, so the columns stay aligned and assistive technology
 * can move by row.
 */
export function JournalDays({
  data,
  money,
  showMetadata,
  showPostings,
  onEntryClick,
  ledgerOwner,
  ledgerName,
  label,
  register,
}: {
  data: Item[];
  money: JournalMoney;
  showMetadata: boolean;
  showPostings: boolean;
  onEntryClick?: (
    entry: JournalDirectiveType,
    opener: HTMLElement | null,
  ) => void;
  ledgerOwner?: string;
  ledgerName?: string;
  label: string;
  /** An account's journal: each entry also carries its change and balance. */
  register?: JournalRegister;
}) {
  const { t, i18n } = useTranslations();
  const days = useMemo(() => {
    const groups: Array<{
      date: string;
      items: Array<Item & { position: number }>;
    }> = [];
    data.forEach((item, index) => {
      const entry = { ...item, position: index + 1 };
      const last = groups.at(-1);
      if (last?.date === item.directive.date) last.items.push(entry);
      else groups.push({ date: item.directive.date, items: [entry] });
    });
    return groups;
  }, [data]);

  return (
    <div className="journal">
      {/* A plain table, not the shared one: its sideways scroller would hold
          the day headings, which stay pinned as the reader scrolls. */}
      <table aria-label={label} className="w-full table-fixed text-sm">
        <colgroup>
          {/* Wide, the entry keeps a reading width and the accounts take
              the rest, so nothing strands the amount across empty space. */}
          <col className="xl:w-[20rem] 2xl:w-[24rem]" />
          {/* Accounts: a column of their own only where there is room. */}
          <col className="w-0 xl:w-auto" />
          {/* Amount: on a phone it rides the entry's first line instead. */}
          <col className="w-0 sm:w-40" />
          <col className="w-12 sm:w-20" />
        </colgroup>
        <TableHeader className="sr-only">
          <TableRow>
            <TableHead scope="col">{t("journal.entryHeader")}</TableHead>
            <TableHead scope="col">{t("journal.account")}</TableHead>
            <TableHead scope="col">{t("journal.amountLabel")}</TableHead>
            <TableHead scope="col">{t("journal.postings")}</TableHead>
          </TableRow>
        </TableHeader>
        {days.map((day) => (
          <TableBody key={day.date}>
            <TableRow className="border-b border-border/50 bg-muted/30 hover:bg-muted/30">
              <TableHead
                scope="rowgroup"
                colSpan={4}
                className="sticky -top-4 z-[1] h-auto bg-muted px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground tabular-nums sm:px-5 md:-top-6"
              >
                <time dateTime={day.date}>
                  {formatDay(day.date, i18n.language)}
                </time>
              </TableHead>
            </TableRow>
            {day.items.map((item) => (
              <DayEntryRows
                key={
                  item.directive.entry_hash ||
                  `${item.directive.directive_type}-${item.directive.date}-${item.position}`
                }
                item={item}
                position={item.position}
                money={money}
                showMetadata={showMetadata}
                showPostings={showPostings}
                onEntryClick={onEntryClick}
                ledgerOwner={ledgerOwner}
                ledgerName={ledgerName}
                register={register}
              />
            ))}
          </TableBody>
        ))}
      </table>
    </div>
  );
}
