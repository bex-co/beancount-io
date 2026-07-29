import type { JournalDirectiveType } from "@/common/types/journal";
import {
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

interface JournalDescriptionProps {
  directive: JournalDirectiveType;
}

export function JournalDescription({ directive }: JournalDescriptionProps) {
  const { t } = useTranslations();

  if (isJournalTransaction(directive))
    return <TransactionDescription directive={directive} />;
  if (isJournalBalance(directive))
    return <BalanceDescription directive={directive} />;
  if (isJournalDocument(directive))
    return <DocumentDescription directive={directive} />;
  if (isJournalOpen(directive))
    return <OpenDescription directive={directive} />;
  if (isJournalClose(directive))
    return <CloseDescription directive={directive} />;
  if (isJournalNote(directive))
    return <NoteDescription directive={directive} />;
  if (isJournalPad(directive)) return <PadDescription directive={directive} />;
  if (isJournalCustom(directive))
    return <CustomDescription directive={directive} />;
  if (isJournalEvent(directive))
    return <EventDescription directive={directive} />;
  if (isJournalPrice(directive))
    return <PriceDescription directive={directive} />;

  return <div className="flex-1 px-2">{t("journal.unknownDirectiveType")}</div>;
}
