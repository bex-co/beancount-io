import { Fragment, useId, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  type JournalDirectiveType,
  isJournalBalance,
  isJournalTransaction,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { directiveTypeLabel } from "@/common/lib/beancount/directive-type-label";
import { summarizeTransaction } from "@/common/lib/beancount/transaction-summary";
import { getClickableRowProps } from "@/common/components/clickable-row";
import { Amount } from "@/common/components/amount";
import { cn } from "@/common/lib/utils/utils";
import { JournalDescription } from "./journal-description";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { JournalMetadata } from "./journal-metadata";
import { displayableMetadataEntries } from "./journal-metadata-entries";
import { JournalPostings } from "./journal-postings";
import { JournalPostingToggle } from "./journal-posting-toggle";
import { journalEntryLabel } from "./journal-entry-label";
import { type JournalMoney, TransactionAmount } from "./journal-days";
import { moneyFlow, shortAccountPair } from "./journal-money-flow";
import { BalanceCheck } from "./journal-balance-check";
import { balanceIsOff, balanceRowTone } from "./journal-balance-tone";

type Item = { directive: JournalDirectiveType };
type OpenEntry = (
  entry: JournalDirectiveType,
  opener: HTMLElement | null,
) => void;

/** The flag's own colour: pending stands out, cleared stays quiet. */
function flagTone(flag: string): string {
  if (flag === "!") return "font-semibold text-amber-700 dark:text-amber-400";
  if (flag === "*") return "text-muted-foreground";
  return "text-foreground";
}

const OPENER =
  "-mx-1 min-w-0 truncate rounded-sm px-1 py-0.5 text-start font-medium pointer-coarse:min-w-11 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:-my-2.5 pointer-coarse:py-2.5 forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]";

function LineRows({
  item,
  position,
  money,
  showMetadata,
  showPostings,
  onEntryClick,
  ledgerOwner,
  ledgerName,
}: {
  item: Item;
  position: number;
  money: JournalMoney;
  showMetadata: boolean;
  showPostings: boolean;
  onEntryClick?: OpenEntry;
  ledgerOwner?: string;
  ledgerName?: string;
}) {
  const { t } = useTranslations();
  // Grouped as the transactions' amounts are (2,962.67, not 2962.67).
  const formatNumber = useFormatNumber();
  const directive = item.directive;
  const transaction = isJournalTransaction(directive) ? directive : null;
  const balance = isJournalBalance(directive) ? directive : null;
  const entryLabel = journalEntryLabel(directive);
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
  const flow = useMemo(
    () => (transaction ? moneyFlow(transaction) : null),
    [transaction],
  );
  const shortFlow = flow ? shortAccountPair(flow.from, flow.to) : null;
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
  const marks = transaction
    ? [
        ...(transaction.tags ?? []).map((tag) => `#${tag}`),
        ...(transaction.links ?? []).map((link) => `^${link}`),
      ]
    : [];
  const rowProps = onEntryClick
    ? getClickableRowProps<HTMLTableRowElement>(
        (event) => onEntryClick(directive, event.currentTarget),
        { className: "transition-colors", preserveTableSemantics: true },
      )
    : { className: "" };
  const statusLabel = transaction
    ? transaction.flag === "*"
      ? t("journal.clearedStatus")
      : transaction.flag === "!"
        ? t("journal.pendingStatus")
        : t("journal.otherTransactions")
    : undefined;

  return (
    <>
      <tr
        {...rowProps}
        className={cn(
          "border-b border-border/50",
          rowProps.className,
          balance ? balanceRowTone(balance) : "hover:bg-muted/30",
        )}
      >
        <td className="py-2 ps-3 align-top font-mono text-xs leading-5 whitespace-nowrap text-muted-foreground tabular-nums sm:ps-5 sm:text-[13px] pointer-coarse:py-2.5 pointer-coarse:leading-6">
          {/* The day on every line, as a statement prints it; month and day
              where a phone has no room for the year. */}
          <time dateTime={directive.date}>
            <span className="md:hidden">
              <span className="sr-only">{directive.date.slice(0, 5)}</span>
              {directive.date.slice(5)}
            </span>
            <span className="hidden md:inline">{directive.date}</span>
          </time>
        </td>
        <td className="p-0 text-center align-top leading-5 sm:py-2 pointer-coarse:sm:py-2.5 pointer-coarse:sm:leading-6">
          <span className="hidden sm:inline">
            {balance ? (
              <BalanceCheck
                directive={balance}
                iconOnly
                className="align-[-3px]"
              />
            ) : transaction ? (
              <span
                className={cn("font-mono", flagTone(transaction.flag))}
                title={statusLabel}
              >
                {transaction.flag}
                <span className="sr-only"> {statusLabel}</span>
              </span>
            ) : null}
          </span>
        </td>
        <td className="py-1.5 pe-2 ps-2 align-top text-[15px] leading-5 sm:ps-1 sm:text-sm pointer-coarse:py-2.5 pointer-coarse:text-base pointer-coarse:leading-6">
          <div className="flex min-w-0 items-baseline gap-2">
            {/* On a phone the status column folds into the line: only what
                is not cleared needs saying. */}
            {transaction && transaction.flag !== "*" && (
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono sm:hidden",
                  flagTone(transaction.flag),
                )}
              >
                {transaction.flag}
              </span>
            )}
            {balance && (
              // The check, where a phone has no status column for it.
              <BalanceCheck
                directive={balance}
                iconOnly
                className="self-center sm:hidden"
              />
            )}
            {onEntryClick ? (
              <button
                type="button"
                aria-label={t("journal.openEntryWithContext", {
                  entry: entryLabel,
                  position,
                })}
                // Payees are the ledger's own words: in a right-to-left
                // interface an English one still loses its end.
                dir="auto"
                className={cn(
                  OPENER,
                  // Alone on its line where the accounts drop beneath it:
                  // whole, never cut to a stub that three rows share.
                  "@max-4xl/journal:whitespace-normal @max-4xl/journal:[overflow-wrap:anywhere]",
                  balance && "shrink-0",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onEntryClick(directive, event.currentTarget);
                }}
              >
                {title}
              </button>
            ) : (
              <span
                dir="auto"
                title={title}
                className="min-w-0 truncate font-medium"
              >
                {title}
              </span>
            )}
            {narration && (
              <span
                dir="auto"
                // Cut to the line, and whole on hover.
                title={narration}
                className="hidden min-w-0 truncate text-muted-foreground @4xl/journal:inline"
              >
                {narration}
              </span>
            )}
            {marks.length > 0 && (
              <span className="hidden shrink-0 text-xs text-primary @4xl/journal:inline">
                {marks.join(" ")}
              </span>
            )}
            {balance && (
              <>
                {balanceIsOff(balance) && (
                  <BalanceCheck
                    directive={balance}
                    className="hidden shrink-0 text-[13px] @4xl/journal:inline-flex"
                  />
                )}
              </>
            )}
            {!transaction && !balance && (
              // Notes, prices, documents: their own words, on one line.
              <span className="min-w-0 truncate text-muted-foreground [&_div]:inline [&_div]:p-0">
                <JournalDescription directive={directive} />
              </span>
            )}
          </div>
          {/* Where there is no Account column, a second line says what the
              entry was and where the money went: narration, then from → to
              by the accounts' last names, whole on hover. */}
          {transaction && (narration || flow || marks.length > 0) && (
            <p
              dir="auto"
              title={[
                narration,
                flow && `${flow.from} → ${flow.to}`,
                marks.join(" "),
              ]
                .filter(Boolean)
                .join(" · ")}
              className={cn(
                "mt-0.5 text-sm leading-5 text-muted-foreground sm:flex sm:min-w-0 sm:items-baseline sm:text-[13px] sm:whitespace-nowrap @4xl/journal:hidden",
                // A phone gives the accounts a line of their own, below.
                !narration && marks.length === 0 && "max-sm:hidden",
              )}
            >
              <span
                title={narration || undefined}
                className="sm:min-w-0 sm:truncate"
              >
                {narration}
              </span>
              {shortFlow && flow && (
                <>
                  <span
                    title={`${flow.from} → ${flow.to}`}
                    className="min-w-0 truncate max-sm:hidden"
                  >
                    {narration && "\u00a0·\u00a0"}
                    {shortFlow.from}
                    <ArrowRight
                      aria-hidden="true"
                      className="mx-1 inline size-3 align-[-1px] text-muted-foreground/70 rtl:-scale-x-100"
                    />
                    <span className="sr-only"> → </span>
                    {shortFlow.to}
                  </span>
                  {/* How many more accounts, kept when the names are cut. */}
                  {flow.more > 0 && (
                    <span className="shrink-0 max-sm:hidden">{`\u00a0+${flow.more}`}</span>
                  )}
                </>
              )}
              {marks.length > 0 && (
                <span
                  title={marks.join(" ")}
                  className="text-primary sm:min-w-0 sm:truncate"
                >
                  {/* Set apart from the accounts before them on one line. */}
                  {(narration || shortFlow) && (
                    <span aria-hidden="true" className="hidden sm:inline">
                      {"\u00a0·"}
                    </span>
                  )}
                  {/* Each tag whole: a phone wraps between them. */}
                  {marks.map((mark) => (
                    <span key={mark}>
                      {" "}
                      <span className="whitespace-nowrap">{mark}</span>
                    </span>
                  ))}
                </span>
              )}
            </p>
          )}
          {transaction && shortFlow && flow && (
            // On a phone, where the money went has a line of its own and
            // wraps there rather than being cut short.
            <p
              title={`${flow.from} → ${flow.to}`}
              className="mt-0.5 text-sm leading-5 [overflow-wrap:anywhere] text-muted-foreground sm:hidden"
            >
              {shortFlow.from}{" "}
              {/* The arrow travels with where the money went. */}
              <span className="whitespace-nowrap">
                <ArrowRight
                  aria-hidden="true"
                  className="me-1 inline size-3 align-[-1px] text-muted-foreground/70 rtl:-scale-x-100"
                />
                <span className="sr-only">→ </span>
                {shortFlow.to}
                {flow.more > 0 && `\u00a0+${flow.more}`}
              </span>
            </p>
          )}
          {balance && (
            // The account the statement is for, in full, breaking only
            // between its names; and what it is off by, if it is.
            <div className="mt-0.5 space-y-0.5 @4xl/journal:hidden">
              <p className="text-[13px] leading-5 text-muted-foreground">
                {balance.account.split(":").map((part, index) => (
                  <span key={index}>
                    {index > 0 && ":"}
                    {index > 0 && <wbr />}
                    {part}
                  </span>
                ))}
              </p>
              {balanceIsOff(balance) && (
                <BalanceCheck directive={balance} className="text-sm" />
              )}
            </div>
          )}
        </td>
        <td className="p-0 align-top text-[13px] leading-5 text-muted-foreground @4xl/journal:py-2 @4xl/journal:pe-4 pointer-coarse:@4xl/journal:py-2.5 pointer-coarse:@4xl/journal:leading-6">
          {balance && (
            // The account the statement is for, where transactions show
            // theirs.
            <span
              title={balance.account}
              className="hidden min-w-0 truncate @4xl/journal:block"
            >
              {balance.account}
            </span>
          )}
          {flow && shortFlow && (
            // Where the list is not yet wide enough for full names: the
            // accounts by the names that tell them apart, whole on hover.
            <span
              title={`${flow.from} → ${flow.to}`}
              className="hidden min-w-0 items-center gap-1.5 @4xl/journal:flex @5xl/journal:hidden"
            >
              <span className="min-w-0 truncate">{shortFlow.from}</span>
              <ArrowRight
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground/70 rtl:-scale-x-100"
              />
              <span className="min-w-0 truncate">{shortFlow.to}</span>
              {flow.more > 0 && (
                <span className="shrink-0 whitespace-nowrap">+{flow.more}</span>
              )}
            </span>
          )}
          {flow && (
            <span className="hidden min-w-0 items-center gap-1.5 @5xl/journal:flex">
              <span title={flow.from} className="min-w-0 truncate">
                {flow.from}
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground/70 rtl:-scale-x-100"
              />
              <span title={flow.to} className="min-w-0 truncate">
                {flow.to}
              </span>
              {flow.more > 0 && (
                <span className="shrink-0 whitespace-nowrap">+{flow.more}</span>
              )}
            </span>
          )}
        </td>
        <td className="py-2 pe-2 align-top text-[15px] leading-5 sm:text-sm pointer-coarse:py-2.5 pointer-coarse:text-base pointer-coarse:leading-6">
          {/* The amount, and the entry's postings beside it: under it on a
              phone, so the entry's own words get the width. */}
          <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-start sm:justify-end sm:gap-2">
            <div className="text-end sm:whitespace-nowrap">
              {summary && transaction ? (
                <TransactionAmount
                  summary={summary}
                  transaction={transaction}
                  money={money}
                  quietPrimaryOnPhone
                />
              ) : balance?.amount ? (
                // The balance the statement gave, as asserted.
                <Amount className="font-medium tabular-nums">
                  {formatNumber(
                    balance.amount.number,
                    balance.amount.currency,
                    fractionDigitsOf(balance.amount.number),
                  )}
                  <span
                    className={
                      balance.amount.currency === money.primaryCurrency
                        ? "max-sm:sr-only"
                        : "max-sm:block max-sm:text-xs max-sm:font-normal max-sm:text-muted-foreground"
                    }
                  >
                    {" "}
                    {balance.amount.currency}
                  </span>
                </Amount>
              ) : null}
            </div>
            {transaction ? (
              <div className="flex justify-end sm:w-14">
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
                  className="-me-1.5 sm:-my-1 sm:me-0 pointer-coarse:-my-1.5 pointer-coarse:h-11 pointer-coarse:min-w-11 sm:pointer-coarse:-my-2.5"
                />
              </div>
            ) : (
              <span aria-hidden="true" className="hidden sm:block sm:w-14" />
            )}
          </div>
        </td>
      </tr>
      {(hasVisiblePostings || hasVisibleMetadata) && (
        <tr className="border-b border-border/50">
          <td colSpan={5} className="p-0 whitespace-normal">
            {transaction && hasVisiblePostings && (
              <div id={postingsRegionId}>
                <JournalPostings
                  directive={transaction}
                  showPostings={postingsVisible}
                  ledgerOwner={ledgerOwner}
                  ledgerName={ledgerName}
                  compact
                  inset="lines"
                />
              </div>
            )}
            <JournalMetadata
              directive={directive}
              showMetadata={showMetadata}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * The journal for reconciling: one line per entry, the date and its status
 * in columns of their own, as a bank statement prints them, so a reader can
 * run down the dates and amounts beside the statement. Balance assertions
 * sit in the flow as checkpoints, green where the ledger matches and red
 * where it is off. Postings open beneath a line.
 */
export function JournalLines({
  data,
  money,
  showMetadata,
  showPostings,
  onEntryClick,
  ledgerOwner,
  ledgerName,
  label,
}: {
  data: Item[];
  money: JournalMoney;
  showMetadata: boolean;
  showPostings: boolean;
  onEntryClick?: OpenEntry;
  ledgerOwner?: string;
  ledgerName?: string;
  label: string;
}) {
  const { t } = useTranslations();
  return (
    // The Account column comes in by the list's own width, not the
    // window's: a sidebar open or closed changes what fits.
    <div className="journal @container/journal">
      <table aria-label={label} className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-12 sm:w-16 md:w-[7.5rem]" />
          <col className="w-0 sm:w-8" />
          <col />
          {/* From and to, where there is room for full account names. */}
          <col className="w-0 @4xl/journal:w-[30%] @5xl/journal:w-[34%]" />
          <col className="w-24 sm:w-52" />
        </colgroup>
        {/* Named columns, pinned while the reader scrolls a long page. */}
        {/* Flush with the top of the scrolling page, past its padding, so
            no row shows above the header or through a gap. */}
        <thead className="sticky -top-2 z-[1] md:-top-6 bg-muted text-xs text-muted-foreground">
          <tr className="border-b border-border/60">
            <th
              scope="col"
              className="py-2 ps-3 text-start font-medium sm:ps-5"
            >
              {t("journal.date")}
            </th>
            <th scope="col" className="p-0 font-medium">
              <span className="sr-only">{t("journal.flag")}</span>
            </th>
            <th
              scope="col"
              className="py-2 ps-2 text-start font-medium sm:ps-1"
            >
              {t("journal.entryHeader")}
            </th>
            <th
              scope="col"
              className="p-0 text-start font-medium @4xl/journal:py-2"
            >
              <span className="hidden @4xl/journal:inline">
                {t("journal.account")}
              </span>
            </th>
            <th scope="col" className="py-2 pe-2 text-end font-medium">
              <div className="flex items-center justify-end gap-2">
                <span>
                  {t("journal.amountLabel")}
                  {/* A phone leaves the ledger's own currency off each
                      figure; the heading says which it is. */}
                  <span className="sm:hidden"> · {money.primaryCurrency}</span>
                </span>
                {/* Named where it has its own place beside the amount; the
                    count is the entry's postings, opened in place. */}
                <span
                  title={t("journal.postings")}
                  className="max-sm:sr-only sm:w-14 sm:truncate sm:text-end"
                >
                  {t("journal.postings")}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const year = item.directive.date.slice(0, 4);
            const newYear =
              index === 0 ||
              data[index - 1].directive.date.slice(0, 4) !== year;
            return (
              <Fragment
                key={
                  item.directive.entry_hash ||
                  `${item.directive.directive_type}-${item.directive.date}-${index}`
                }
              >
                {newYear && (
                  // A phone's dates drop the year; it heads the lines it
                  // belongs to instead.
                  <tr aria-hidden="true" className="md:hidden">
                    <td
                      colSpan={5}
                      className="border-b border-border/50 bg-muted/40 py-1 ps-3 font-mono text-xs font-medium text-muted-foreground tabular-nums"
                    >
                      {year}
                    </td>
                  </tr>
                )}
                <LineRows
                  item={item}
                  position={index + 1}
                  money={money}
                  showMetadata={showMetadata}
                  showPostings={showPostings}
                  onEntryClick={onEntryClick}
                  ledgerOwner={ledgerOwner}
                  ledgerName={ledgerName}
                />
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
