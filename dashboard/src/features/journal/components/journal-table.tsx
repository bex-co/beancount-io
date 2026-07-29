import { useState } from "react";
import {
  type JournalDirectiveType,
  isJournalTransaction,
  isJournalDocument,
  isJournalCustom,
} from "@/common/types/journal";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { formatAmount as formatAmountLib } from "@/common/lib/format/format-amount";
import { useTranslations } from "@/common/hooks/use-translations";
import { JournalDescription } from "./journal-description";
import { JournalMetadata } from "./journal-metadata";
import { JournalPostings } from "./journal-postings";
import { Button } from "@/common/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/common/lib/utils/utils";
import { getClickableRowProps } from "@/common/components/clickable-row";

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
  ledgerOwner?: string;
  ledgerName?: string;
}

const formatAmountWithCurrency = (amount: {
  number: string;
  currency: string;
}) => {
  return `${formatAmountLib(amount.number)} ${amount.currency}`;
};

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

interface JournalTableHeaderProps {
  isAccountJournal?: boolean;
}

function JournalTableHeader({
  isAccountJournal = false,
}: JournalTableHeaderProps) {
  const { t } = useTranslations();

  return (
    <div className="head border-b border-border bg-muted/40">
      <div className="flex items-center">
        <span className="w-20 shrink-0 py-2.5 text-center text-xs font-medium text-muted-foreground sm:w-24 sm:text-sm">
          {t("journal.date")}
        </span>
        <span className="flag w-12 shrink-0 py-2.5 text-center text-xs font-medium text-muted-foreground sm:w-24 sm:text-sm">
          F
        </span>
        <span className="description min-w-0 flex-1 px-1 py-2.5 text-xs font-medium text-muted-foreground sm:px-2 sm:text-sm">
          {t("journal.payeeNarration")}
        </span>
        <span className="w-10 shrink-0 sm:hidden">
          <span className="sr-only">{t("journal.postings")}</span>
        </span>
        {isAccountJournal ? (
          <>
            <span className="num hidden w-20 shrink-0 py-2.5 text-right text-xs font-medium text-muted-foreground sm:block sm:w-32 sm:text-sm">
              {t("journal.unitsHeader")}
            </span>
            <span className="num hidden w-20 shrink-0 py-2.5 text-right text-xs font-medium text-muted-foreground sm:block sm:w-32 sm:text-sm">
              {t("journal.change")}
            </span>
            <span className="num hidden w-20 shrink-0 py-2.5 text-right text-xs font-medium text-muted-foreground sm:block sm:w-32 sm:text-sm">
              {t("journal.balanceHeader")}
            </span>
          </>
        ) : (
          <span className="hidden w-24 shrink-0 py-2.5 text-right text-xs font-medium text-muted-foreground sm:block sm:text-sm">
            {t("journal.postings")}
          </span>
        )}
      </div>
    </div>
  );
}

interface JournalPostingToggleProps {
  directive: JournalDirectiveType;
  onClick?: () => void;
  expanded: boolean;
}

function JournalPostingToggle({
  directive,
  onClick,
  expanded,
}: JournalPostingToggleProps) {
  const { t } = useTranslations();
  if (!isJournalTransaction(directive)) {
    return null;
  }
  const amount = directive.postings?.length || 0;

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

interface JournalTableRowProps {
  item: JournalTableItem;
  showMetadata?: boolean;
  showPostings?: boolean;
  onEntryClick?: (entryHash: JournalDirectiveType) => void;
  isAccountJournal?: boolean;
  ledgerOwner?: string;
  ledgerName?: string;
}

function JournalTableRow({
  item,
  showMetadata = true,
  showPostings = true,
  onEntryClick,
  isAccountJournal = false,
  ledgerOwner,
  ledgerName,
}: JournalTableRowProps) {
  const directive = item.directive;
  const typeClass = getDirectiveTypeClass(directive);
  const isTransaction = isJournalTransaction(directive);
  const [isPostingsExpanded, setIsPostingsExpanded] = useState(false);
  const postingsVisible = showPostings || isPostingsExpanded;
  const rowProps = onEntryClick
    ? getClickableRowProps<HTMLDivElement>(() => onEntryClick(directive), {
        className:
          "group flex items-start py-2.5 transition-colors hover:bg-muted/25",
        role: "button",
      })
    : {
        className:
          "group flex items-start py-2.5 transition-colors hover:bg-muted/25",
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

  return (
    <div className={cn(typeClass, "border-b border-border/50 last:border-b-0")}>
      <div {...rowProps}>
        {/* Date */}
        <span className="w-20 shrink-0 text-center font-mono text-xs tabular-nums sm:w-24 sm:text-sm">
          <span className={cn(onEntryClick && "text-primary")}>
            {formatDateISO(directive.date)}
          </span>
        </span>

        {/* Flag */}
        <span className="flag flex w-12 shrink-0 justify-center text-center font-mono text-xs sm:w-24 sm:text-sm">
          <span
            className={cn(
              "max-w-full truncate rounded-md px-1.5 py-0.5",
              flagTone,
            )}
            title={directive.directive_type}
          >
            {isTransaction ? directive.flag : directive.directive_type}
          </span>
        </span>

        {/* Description */}
        <JournalDescription directive={directive} />

        {isAccountJournal ? (
          <>
            <span className="hidden w-20 shrink-0 text-right font-mono text-xs sm:block sm:w-32 sm:text-sm">
              {isTransaction && (
                <div className="flex justify-end">
                  <JournalPostingToggle
                    directive={directive}
                    onClick={togglePostings}
                    expanded={postingsVisible}
                  />
                </div>
              )}
            </span>
            <span className="num hidden w-20 shrink-0 text-right font-mono text-xs sm:block sm:w-32 sm:text-sm">
              <JournalAmounts balance={item.change} />
            </span>
            <span className="num hidden w-20 shrink-0 text-right font-mono text-xs sm:block sm:w-32 sm:text-sm">
              {isTransaction && <JournalAmounts balance={item.balance} />}
            </span>
          </>
        ) : (
          <span className="hidden w-24 shrink-0 sm:block">
            <div className="flex justify-end">
              {isTransaction && (
                <JournalPostingToggle
                  directive={directive}
                  onClick={togglePostings}
                  expanded={postingsVisible}
                />
              )}
            </div>
          </span>
        )}

        {/* Posting disclosure - mobile */}
        <span className="flex w-10 shrink-0 justify-end pr-1 sm:hidden">
          {isTransaction && (
            <JournalPostingToggle
              directive={directive}
              onClick={togglePostings}
              expanded={postingsVisible}
            />
          )}
        </span>
      </div>

      {/* Postings for transactions */}
      {isTransaction && (
        <JournalPostings
          directive={directive}
          showPostings={postingsVisible}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
        />
      )}

      {/* Metadata for all directives */}
      <JournalMetadata directive={directive} showMetadata={showMetadata} />
    </div>
  );
}

export function JournalTable({
  data,
  showMetadata = true,
  showPostings = true,
  onEntryClick,
  isAccountJournal = false,
  ledgerOwner,
  ledgerName,
}: JournalTableProps) {
  return (
    <div className="journal flex flex-col">
      <JournalTableHeader isAccountJournal={isAccountJournal} />
      {data.map((item, index) => (
        <JournalTableRow
          key={
            item.directive.entry_hash ||
            `${item.directive.directive_type}-${item.directive.date}-${index}`
          }
          item={item}
          showMetadata={showMetadata}
          showPostings={showPostings}
          onEntryClick={onEntryClick}
          isAccountJournal={isAccountJournal}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
        />
      ))}
    </div>
  );
}
