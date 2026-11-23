import { Fragment, useId, useMemo, useState } from "react";
import { AccountName, AccountPath } from "@/common/components/account-name";
import { ArrowRight } from "lucide-react";
import {
  type JournalDirectiveType,
  isJournalBalance,
  isJournalDocument,
  isJournalTransaction,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { directiveTypeLabel } from "@/common/lib/beancount/directive-type-label";
import { summarizeTransaction } from "@/common/lib/beancount/transaction-summary";
import { getClickableRowProps } from "@/common/components/clickable-row";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { cn } from "@/common/lib/utils/utils";
import { JournalDescription } from "./journal-description";
import { DocumentDescription } from "./journal-description/document-description";
import { JournalMetadata } from "./journal-metadata";
import { displayableMetadataEntries } from "./journal-metadata-entries";
import { JournalPostings } from "./journal-postings";
import { JournalPostingToggle } from "./journal-posting-toggle";
import { useJournalEntryLabel } from "./journal-entry-label";
import { type JournalMoney, TransactionAmount } from "./journal-days";
import { moneyFlow, shortAccountNames } from "./journal-money-flow";
import { BalanceCheck } from "./journal-balance-check";
import {
  balanceRowTone,
  getBalanceStatus,
  type BalanceStatus,
} from "./journal-balance-tone";
import {
  type JournalRegister,
  type JournalTableItem,
  RegisterBalance,
  RegisterChange,
} from "./journal-register";

type Item = JournalTableItem;
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

function flowSeparator(directed: boolean, className: string) {
  return directed ? (
    <>
      <ArrowRight
        aria-hidden="true"
        className={cn(
          "size-3 text-muted-foreground/70 rtl:-scale-x-100",
          className,
        )}
      />
      <span className="sr-only"> → </span>
    </>
  ) : (
    <span> · </span>
  );
}

function LineRows({
  item,
  balanceStatus,
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
  balanceStatus: BalanceStatus;
  position: number;
  money: JournalMoney;
  showMetadata: boolean;
  showPostings: boolean;
  onEntryClick?: OpenEntry;
  ledgerOwner?: string;
  ledgerName?: string;
  register?: JournalRegister;
}) {
  const { t } = useTranslations();
  const directive = item.directive;
  const transaction = isJournalTransaction(directive) ? directive : null;
  const balance = isJournalBalance(directive) ? directive : null;
  const document = isJournalDocument(directive) ? directive : null;
  // Descriptive entries can use the empty columns before the register balance.
  const hasStatementColumns = transaction !== null || balance !== null;
  const entryLabel = useJournalEntryLabel(directive, balanceStatus);
  const showBalanceDetails =
    balanceStatus === "off" || balanceStatus === "unchecked";
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
  const flowTitle = flow?.accounts.join(flow.directed ? " → " : " · ");
  const [shortFirst, shortSecond] = shortAccountNames(flow?.accounts ?? []);
  const [firstAccount, secondAccount] = flow?.accounts ?? [];
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
          balanceRowTone(balanceStatus),
        )}
      >
        <td className="py-2 ps-3 align-top text-xs leading-5 whitespace-nowrap text-muted-foreground tabular-nums sm:ps-5 sm:text-[13px] pointer-coarse:py-2.5 pointer-coarse:leading-6">
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
                status={balanceStatus}
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
        <td
          colSpan={hasStatementColumns ? undefined : register ? 2 : 3}
          className="py-1.5 pe-2 ps-2 align-top text-[15px] leading-5 sm:ps-1 sm:text-sm pointer-coarse:py-2.5 pointer-coarse:text-base pointer-coarse:leading-6"
        >
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
                status={balanceStatus}
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
                  !transaction &&
                    "max-w-full shrink-0 whitespace-normal [overflow-wrap:anywhere]",
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
                className={cn(
                  "min-w-0 truncate font-medium",
                  !transaction &&
                    "max-w-full shrink-0 whitespace-normal [overflow-wrap:anywhere]",
                )}
              >
                {title}
              </span>
            )}
            {transaction?.not_booked === true && (
              // The ledger could not book it: listed, but not in any
              // balance (w21/678), as the day layout marks it.
              <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-amber-700 dark:text-amber-400">
                {t("journal.notBooked")}
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
            {balance && showBalanceDetails && (
              <BalanceCheck
                directive={balance}
                status={balanceStatus}
                ledgerOwner={ledgerOwner}
                ledgerName={ledgerName}
                className="hidden text-[13px] @4xl/journal:inline-flex"
              />
            )}
            {!transaction && !balance && !document && (
              // Notes, prices and other directives on one line.
              <span className="min-w-0 truncate text-muted-foreground">
                <JournalDescription directive={directive} compact />
              </span>
            )}
          </div>
          {document && (
            <div className="-mx-2 mt-0.5 text-muted-foreground">
              <DocumentDescription
                directive={document}
                ledgerOwner={ledgerOwner}
                ledgerName={ledgerName}
              />
            </div>
          )}
          {/* Where there is no Account column, a second line says what the
              entry was and where the money went: narration, then from → to
              by the accounts' last names, whole on hover. */}
          {transaction && (narration || flow || marks.length > 0) && (
            <p
              dir="auto"
              title={[narration, flowTitle, marks.join(" ")]
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
              {flow && (
                <>
                  <span
                    title={flowTitle}
                    className="min-w-0 truncate max-sm:hidden"
                  >
                    {narration && "\u00a0·\u00a0"}
                    {shortFirst}
                    {shortSecond &&
                      flowSeparator(flow.directed, "mx-1 inline align-[-1px]")}
                    {shortSecond}
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
                  {(narration || flow) && (
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
          {flow && (
            // On a phone, where the money went has a line of its own and
            // wraps there rather than being cut short.
            <p
              title={flowTitle}
              className="mt-0.5 text-sm leading-5 [overflow-wrap:anywhere] text-muted-foreground sm:hidden"
            >
              {shortFirst} {/* The arrow travels with where the money went. */}
              <span className="whitespace-nowrap">
                {shortSecond &&
                  flowSeparator(flow.directed, "me-1 inline align-[-1px]")}
                {shortSecond}
                {flow.more > 0 && `\u00a0+${flow.more}`}
              </span>
            </p>
          )}
          {balance && (
            // The account the statement is for, in full, breaking only
            // between its names; and what it is off by, if it is.
            <div className="mt-0.5 space-y-0.5 @4xl/journal:hidden">
              <p className="text-[13px] leading-5 text-muted-foreground">
                <AccountPath account={balance.account} />
              </p>
              {showBalanceDetails && (
                <BalanceCheck
                  directive={balance}
                  status={balanceStatus}
                  ledgerOwner={ledgerOwner}
                  ledgerName={ledgerName}
                  className="text-sm"
                />
              )}
            </div>
          )}
        </td>
        {hasStatementColumns && (
          <td className="p-0 align-top text-[13px] leading-5 text-muted-foreground @4xl/journal:py-2 @4xl/journal:pe-4 pointer-coarse:@4xl/journal:py-2.5 pointer-coarse:@4xl/journal:leading-6">
            {balance && (
              // The account the statement is for, where transactions show
              // theirs.
              <AccountName
                account={balance.account}
                title={balance.account}
                className="hidden text-[13px] @4xl/journal:block"
              />
            )}
            {flow && (
              // Where the list is not yet wide enough for full names: the
              // accounts by the names that tell them apart, whole on hover.
              <span
                title={flowTitle}
                className="hidden min-w-0 items-center gap-1.5 @4xl/journal:flex @5xl/journal:hidden"
              >
                {/* Last parts only: in the foreground, as every account's
                  last part is. */}
                <span className="min-w-0 truncate font-medium text-foreground">
                  {shortFirst}
                </span>
                {shortSecond && (
                  <>
                    {flowSeparator(flow.directed, "shrink-0")}
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {shortSecond}
                    </span>
                  </>
                )}
                {flow.more > 0 && (
                  <span className="shrink-0 whitespace-nowrap">
                    +{flow.more}
                  </span>
                )}
              </span>
            )}
            {flow && firstAccount && (
              <span className="hidden min-w-0 items-center gap-1.5 @5xl/journal:flex">
                <AccountName
                  account={firstAccount}
                  title={firstAccount}
                  className="text-[13px]"
                />
                {secondAccount && (
                  <>
                    {flowSeparator(flow.directed, "shrink-0")}
                    <AccountName
                      account={secondAccount}
                      title={secondAccount}
                      className="text-[13px]"
                    />
                  </>
                )}
                {flow.more > 0 && (
                  <span className="shrink-0 whitespace-nowrap">
                    +{flow.more}
                  </span>
                )}
              </span>
            )}
          </td>
        )}
        {(hasStatementColumns || register) && (
          <td className="py-2 pe-2 align-top text-[15px] leading-5 sm:text-sm pointer-coarse:py-2.5 pointer-coarse:text-base pointer-coarse:leading-6">
            {/* The amount, and the entry's postings beside it: under it on a
              phone, so the entry's own words get the width. */}
            <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-start sm:justify-end sm:gap-2">
              <div className="text-end sm:whitespace-nowrap">
                {register && !balance ? (
                  // On an account's journal: what the entry did there.
                  <RegisterChange
                    item={item}
                    register={register}
                    quietCurrencyOnPhone={money.primaryCurrency}
                  />
                ) : summary && transaction ? (
                  <TransactionAmount
                    summary={summary}
                    transaction={transaction}
                    money={money}
                    quietPrimaryOnPhone
                  />
                ) : balance?.amount ? (
                  // The balance the statement gave, as asserted.
                  <LedgerAmount
                    {...balance.amount}
                    tolerance={balance.tolerance}
                    className="font-medium tabular-nums"
                    currencyClassName={
                      balance.amount.currency === money.primaryCurrency
                        ? "max-sm:sr-only"
                        : "max-sm:block max-sm:text-xs max-sm:font-normal max-sm:text-muted-foreground"
                    }
                  />
                ) : null}
              </div>
              {register && (
                // Where the account then stood: its own place beside the
                // amount, and under it on a phone, named there.
                <div className="text-end max-sm:text-xs max-sm:text-muted-foreground max-sm:empty:hidden sm:w-36 sm:whitespace-nowrap">
                  <RegisterBalance
                    item={item}
                    labelClassName="sm:sr-only"
                    quietCurrencyOnPhone={money.primaryCurrency}
                  />
                </div>
              )}
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
        )}
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
  openedAccounts,
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
  openedAccounts?: ReadonlyMap<string, string>;
  money: JournalMoney;
  showMetadata: boolean;
  showPostings: boolean;
  onEntryClick?: OpenEntry;
  ledgerOwner?: string;
  ledgerName?: string;
  label: string;
  /** An account's journal: each line also carries its change and balance. */
  register?: JournalRegister;
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
          {/* Amount and postings, and on an account's journal the balance
              between them. */}
          <col className={register ? "w-28 sm:w-[21rem]" : "w-24 sm:w-52"} />
        </colgroup>
        {/* Named columns, pinned while the reader scrolls a long page. */}
        {/* Flush with the top of the scrolling page, past its padding, so
            no row shows above the header or through a gap. */}
        <thead className="sticky -top-4 z-[1] md:-top-6 bg-muted text-xs text-muted-foreground">
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
                {register && (
                  <span className="max-sm:sr-only sm:w-36 sm:text-end">
                    {t("journal.balanceHeader")}
                  </span>
                )}
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
                      className="border-b border-border/50 bg-muted/40 py-1 ps-3 text-xs font-medium text-muted-foreground tabular-nums"
                    >
                      {year}
                    </td>
                  </tr>
                )}
                <LineRows
                  item={item}
                  balanceStatus={getBalanceStatus(
                    item.directive,
                    openedAccounts,
                  )}
                  position={index + 1}
                  money={money}
                  showMetadata={showMetadata}
                  showPostings={showPostings}
                  onEntryClick={onEntryClick}
                  ledgerOwner={ledgerOwner}
                  ledgerName={ledgerName}
                  register={register}
                />
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
