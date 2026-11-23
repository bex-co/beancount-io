import type { JournalDirectiveType } from "@/common/types/journal";
import {
  DirectiveType,
  isJournalTransaction,
  isJournalBalance,
  isJournalDocument,
  isJournalOpen,
  isJournalClose,
  isJournalNote,
  isJournalPad,
  isJournalCustom,
  isJournalEvent,
  isJournalPrice,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { TransactionDescription } from "./transaction-description";
import { BalanceDescription } from "./balance-description";
import { DocumentDescription } from "./document-description";
import { OpenDescription } from "./open-description";
import { CloseDescription } from "./close-description";
import { NoteDescription } from "./note-description";
import { PadDescription } from "./pad-description";
import { CustomDescription } from "./custom-description";
import { EventDescription } from "./event-description";
import { PriceDescription } from "./price-description";
import { DescriptionParts } from "./description-parts";

interface JournalDescriptionProps {
  directive: JournalDirectiveType;
  ledgerOwner?: string;
  ledgerName?: string;
  compact?: boolean;
}

export function JournalDescription({
  directive,
  ledgerOwner,
  ledgerName,
  compact,
}: JournalDescriptionProps) {
  const { t } = useTranslations();

  if (isJournalTransaction(directive))
    return <TransactionDescription directive={directive} />;
  if (isJournalBalance(directive))
    return <BalanceDescription directive={directive} />;
  if (isJournalDocument(directive))
    return (
      <DocumentDescription
        directive={directive}
        ledgerOwner={ledgerOwner}
        ledgerName={ledgerName}
      />
    );
  if (isJournalOpen(directive))
    return <OpenDescription directive={directive} compact={compact} />;
  if (isJournalClose(directive))
    return <CloseDescription directive={directive} compact={compact} />;
  if (isJournalNote(directive))
    return <NoteDescription directive={directive} compact={compact} />;
  if (isJournalPad(directive))
    return <PadDescription directive={directive} compact={compact} />;
  if (isJournalCustom(directive))
    return <CustomDescription directive={directive} compact={compact} />;
  if (isJournalEvent(directive))
    return <EventDescription directive={directive} compact={compact} />;
  if (isJournalPrice(directive))
    return <PriceDescription directive={directive} compact={compact} />;
  if (directive.directive_type === DirectiveType.COMMODITY) {
    const name = directive.meta?.name;
    return (
      <DescriptionParts
        compact={compact}
        primary={
          <span className="font-mono text-sm">{directive.currency}</span>
        }
        detail={typeof name === "string" && name.trim() && <span>{name}</span>}
      />
    );
  }

  return (
    <DescriptionParts
      compact={compact}
      primary={t("journal.unknownDirectiveType")}
    />
  );
}
