import { useState, type ReactNode } from "react";
import {
  type JournalDirectiveType,
  isJournalTransaction,
  isJournalDocument,
  isJournalCustom,
} from "@/common/types/journal";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { useTranslations } from "@/common/hooks/use-translations";
import { JournalDescription } from "./journal-description";
import { formatAmountWithCurrency } from "./journal-description/utils";
import { JournalMetadata } from "./journal-metadata";
import { JournalPostings } from "./journal-postings";
import { Button } from "@/common/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/common/lib/utils/utils";
import { getClickableRowProps } from "@/common/components/clickable-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { deriveAccountUnits } from "@/features/journal/lib/derive-account-units";

export type JournalTableItem = {
  directive: JournalDirectiveType;
  change?: Record<string, string>;
  balance?: Record<string, string>;
};

interface JournalTableProps {
  data: JournalTableItem[];
  showMetadata?: boolean;
  showPostings?: boolean;
  onEntryClick?: (entryHash: JournalDirectiveType) => void;
  isAccountJournal?: boolean;
  /** Required when `isAccountJournal` to derive the Units column from postings. */
  accountName?: string;
  /** Match child accounts when deriving units; mirrors the journal query flag. */
  withChildren?: boolean;
  ledgerOwner?: string;
  ledgerName?: string;
}

interface JournalAmountsProps {
  balance?: Record<string, string>;
}

function JournalAmounts({ balance }: JournalAmountsProps) {
  if (!balance || Object.keys(balance).length === 0) {
    return null;
  }

  return (
    <>
      {Object.entries(balance).map(([currency, amount]) => (
        <span key={currency} className="block">
          {formatAmountWithCurrency({ number: amount, currency })}
        </span>
      ))}
    </>
  );
}

const getDirectiveTypeClass = (directive: JournalDirectiveType): string => {
  const baseType = directive.directive_type.toLowerCase();

  if (isJournalTransaction(directive)) {
    const flag = directive.flag;
    if (flag === "*") return "transaction cleared";
    if (flag === "!") return "transaction pending";
    return "transaction other";
  }

  if (isJournalDocument(directive)) {
    if (directive.tags.includes("discovered")) return "document discovered";
    if (directive.tags.includes("linked")) return "document linked";
    return "document";
  }

  if (isJournalCustom(directive)) {
    if (directive.type === "budget") return "custom budget";
    return "custom";
  }

  return baseType;
};

type ColumnVisibility = "always" | "desktop" | "mobile";

type JournalColumnId =
  | "date"
  | "flag"
  | "description"
  | "units"
  | "change"
  | "balance"
  | "postings";

type JournalColumnDef = {
  id: JournalColumnId;
  visibility: ColumnVisibility;
  headerClassName: string;
  cellClassName: string;
};

const DATE_COL: JournalColumnDef = {
  id: "date",
  visibility: "always",
  headerClassName:
    "w-20 shrink-0 text-center text-xs font-medium text-muted-foreground sm:w-24 sm:text-sm",
  cellClassName:
    "w-20 shrink-0 text-center font-mono text-xs tabular-nums sm:w-24 sm:text-sm",
};

const FLAG_COL: JournalColumnDef = {
  id: "flag",
  visibility: "always",
  headerClassName:
    "flag w-12 shrink-0 text-center text-xs font-medium text-muted-foreground sm:w-24 sm:text-sm",
  cellClassName:
    "flag w-12 shrink-0 text-center font-mono text-xs sm:w-24 sm:text-sm",
};

const DESCRIPTION_COL: JournalColumnDef = {
  id: "description",
  visibility: "always",
  headerClassName:
    "description min-w-0 text-xs font-medium text-muted-foreground sm:text-sm",
  cellClassName: "description min-w-0",
};

const UNITS_COL: JournalColumnDef = {
  id: "units",
  visibility: "desktop",
  headerClassName:
    "num hidden w-20 text-right text-xs font-medium text-muted-foreground sm:table-cell sm:w-32 sm:text-sm",
  cellClassName:
    "num hidden w-20 text-right font-mono text-xs sm:table-cell sm:w-32 sm:text-sm",
};

const CHANGE_COL: JournalColumnDef = {
  id: "change",
  visibility: "desktop",
  headerClassName:
    "num hidden w-20 text-right text-xs font-medium text-muted-foreground sm:table-cell sm:w-32 sm:text-sm",
  cellClassName:
    "num hidden w-20 text-right font-mono text-xs sm:table-cell sm:w-32 sm:text-sm",
};

const BALANCE_COL: JournalColumnDef = {
  id: "balance",
  visibility: "desktop",
  headerClassName:
    "num hidden w-20 text-right text-xs font-medium text-muted-foreground sm:table-cell sm:w-32 sm:text-sm",
  cellClassName:
    "num hidden w-20 text-right font-mono text-xs sm:table-cell sm:w-32 sm:text-sm",
};

const POSTINGS_DESKTOP_COL: JournalColumnDef = {
  id: "postings",
  visibility: "desktop",
  headerClassName:
    "hidden w-24 shrink-0 text-right text-xs font-medium text-muted-foreground sm:table-cell sm:text-sm",
  cellClassName: "hidden w-24 shrink-0 sm:table-cell",
};

const POSTINGS_MOBILE_COL: JournalColumnDef = {
  id: "postings",
  visibility: "mobile",
  headerClassName: "w-10 shrink-0 sm:hidden",
  cellClassName: "w-10 shrink-0 pr-1 sm:hidden",
};

function journalColumns(isAccountJournal: boolean): JournalColumnDef[] {
  if (isAccountJournal) {
    return [
      DATE_COL,
      FLAG_COL,
      DESCRIPTION_COL,
      UNITS_COL,
      CHANGE_COL,
      BALANCE_COL,
      POSTINGS_DESKTOP_COL,
      POSTINGS_MOBILE_COL,
    ];
  }
  return [
    DATE_COL,
    FLAG_COL,
    DESCRIPTION_COL,
    POSTINGS_DESKTOP_COL,
    POSTINGS_MOBILE_COL,
  ];
}

interface JournalPostingToggleProps {
  directive: JournalDirectiveType;
  onClick?: () => void;
  expanded: boolean;
  /** When true, postings are forced visible globally — show a static indicator. */
  forcedOpen?: boolean;
}

function JournalPostingToggle({
  directive,
  onClick,
  expanded,
  forcedOpen = false,
}: JournalPostingToggleProps) {
  const { t } = useTranslations();
  if (!isJournalTransaction(directive)) {
    return null;
  }
  const amount = directive.postings?.length || 0;

  if (forcedOpen) {
    return (
      <span
        className="inline-flex h-7 min-w-8 items-center justify-center gap-1 px-1.5 text-muted-foreground"
        aria-label={t("journal.postingsAlwaysVisible")}
      >
        <ChevronDown className="size-3.5" aria-hidden />
        <span className="text-xs tabular-nums">{amount}</span>
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 min-w-8 gap-1 px-1.5 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      aria-label={t("journal.togglePostings")}
      aria-expanded={expanded}
    >
      {expanded ? (
        <ChevronDown className="size-3.5" />
      ) : (
        <ChevronRight className="size-3.5" />
      )}
      <span className="text-xs tabular-nums">{amount}</span>
    </Button>
  );
}

interface JournalTableHeaderProps {
  columns: JournalColumnDef[];
}

function JournalTableHeaderRow({ columns }: JournalTableHeaderProps) {
  const { t } = useTranslations();

  const headerLabel = (id: JournalColumnId): ReactNode => {
    switch (id) {
      case "date":
        return t("journal.date");
      case "flag":
        return (
          <abbr title={t("journal.flag")} className="no-underline">
            {t("journal.flagAbbrev")}
          </abbr>
        );
      case "description":
        return t("journal.payeeNarration");
      case "units":
        return t("journal.unitsHeader");
      case "change":
        return t("journal.change");
      case "balance":
        return t("journal.balanceHeader");
      case "postings":
        return t("journal.postings");
    }
  };

  return (
    <TableHeader className="head border-b border-border bg-muted/40">
      <TableRow className="hover:bg-transparent">
        {columns.map((column, index) => {
          const isPostingsMobile =
            column.id === "postings" && column.visibility === "mobile";
          return (
            <TableHead
              key={`${column.id}-${column.visibility}-${index}`}
              scope="col"
              className={cn("h-auto py-2.5", column.headerClassName)}
              aria-label={column.id === "flag" ? t("journal.flag") : undefined}
            >
              {isPostingsMobile ? (
                <span className="sr-only">{headerLabel(column.id)}</span>
              ) : (
                headerLabel(column.id)
              )}
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );
}

interface JournalTableRowProps {
  item: JournalTableItem;
  columns: JournalColumnDef[];
  showMetadata?: boolean;
  showPostings?: boolean;
  onEntryClick?: (entryHash: JournalDirectiveType) => void;
  isAccountJournal?: boolean;
  accountName?: string;
  withChildren?: boolean;
  ledgerOwner?: string;
  ledgerName?: string;
  colSpan: number;
}

function JournalTableEntryRows({
  item,
  columns,
  showMetadata = true,
  showPostings = true,
  onEntryClick,
  isAccountJournal = false,
  accountName = "",
  withChildren = true,
  ledgerOwner,
  ledgerName,
  colSpan,
}: JournalTableRowProps) {
  const directive = item.directive;
  const typeClass = getDirectiveTypeClass(directive);
  const isTransaction = isJournalTransaction(directive);
  const [isPostingsExpanded, setIsPostingsExpanded] = useState(false);
  const postingsVisible = showPostings || isPostingsExpanded;
  const units = isAccountJournal
    ? deriveAccountUnits(directive, accountName, withChildren)
    : undefined;

  const rowProps = onEntryClick
    ? getClickableRowProps<HTMLTableRowElement>(() => onEntryClick(directive), {
        className:
          "group transition-colors hover:bg-muted/25 data-[state=selected]:bg-muted/25",
        preserveTableSemantics: true,
      })
    : {
        className:
          "group transition-colors hover:bg-muted/25 data-[state=selected]:bg-muted/25",
      };

  const togglePostings = () => {
    if (!showPostings) {
      setIsPostingsExpanded((prev) => !prev);
    }
  };

  const flagTone = isTransaction
    ? directive.flag === "*"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : directive.flag === "!"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground"
    : "bg-muted text-muted-foreground";

  const renderPostingToggle = () =>
    isTransaction ? (
      <div className="flex justify-end">
        <JournalPostingToggle
          directive={directive}
          onClick={togglePostings}
          expanded={postingsVisible}
          forcedOpen={showPostings}
        />
      </div>
    ) : null;

  const renderCell = (column: JournalColumnDef) => {
    switch (column.id) {
      case "date":
        return onEntryClick ? (
          <button
            type="button"
            className={cn(
              "rounded-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onEntryClick(directive);
            }}
          >
            {formatDateISO(directive.date)}
          </button>
        ) : (
          formatDateISO(directive.date)
        );
      case "flag":
        return (
          <span
            className={cn(
              "inline-block max-w-full truncate rounded-md px-1.5 py-0.5",
              flagTone,
            )}
            title={directive.directive_type}
          >
            {isTransaction ? directive.flag : directive.directive_type}
          </span>
        );
      case "description":
        return <JournalDescription directive={directive} />;
      case "units":
        return <JournalAmounts balance={units} />;
      case "change":
        return <JournalAmounts balance={item.change} />;
      case "balance":
        return isTransaction ? <JournalAmounts balance={item.balance} /> : null;
      case "postings":
        return renderPostingToggle();
    }
  };

  const detailVisible = (isTransaction && postingsVisible) || showMetadata;

  return (
    <>
      <TableRow
        {...rowProps}
        className={cn(
          typeClass,
          "border-b border-border/50",
          rowProps.className,
        )}
      >
        {columns.map((column, index) => (
          <TableCell
            key={`${column.id}-${column.visibility}-${index}`}
            className={cn("align-top py-2.5", column.cellClassName)}
          >
            {renderCell(column)}
          </TableCell>
        ))}
      </TableRow>
      {detailVisible && (
        <TableRow
          className={cn(
            typeClass,
            "border-b border-border/50 hover:bg-transparent",
          )}
        >
          <TableCell colSpan={colSpan} className="p-0">
            {isTransaction && (
              <JournalPostings
                directive={directive}
                showPostings={postingsVisible}
                ledgerOwner={ledgerOwner}
                ledgerName={ledgerName}
              />
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

export function JournalTable({
  data,
  showMetadata = true,
  showPostings = true,
  onEntryClick,
  isAccountJournal = false,
  accountName = "",
  withChildren = true,
  ledgerOwner,
  ledgerName,
}: JournalTableProps) {
  const { t } = useTranslations();
  const columns = journalColumns(isAccountJournal);
  const label = isAccountJournal
    ? t("journal.accountJournalTable")
    : t("journal.journalTable");

  return (
    <div className="journal">
      <Table aria-label={label} className="w-full">
        <JournalTableHeaderRow columns={columns} />
        <TableBody>
          {data.map((item, index) => (
            <JournalTableEntryRows
              key={
                item.directive.entry_hash ||
                `${item.directive.directive_type}-${item.directive.date}-${index}`
              }
              item={item}
              columns={columns}
              showMetadata={showMetadata}
              showPostings={showPostings}
              onEntryClick={onEntryClick}
              isAccountJournal={isAccountJournal}
              accountName={accountName}
              withChildren={withChildren}
              ledgerOwner={ledgerOwner}
              ledgerName={ledgerName}
              colSpan={columns.length}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
