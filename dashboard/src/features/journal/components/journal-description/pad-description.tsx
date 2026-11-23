import type { JournalPad } from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { DescriptionParts } from "./description-parts";

interface PadDescriptionProps {
  directive: JournalPad;
  compact?: boolean;
}

export function PadDescription({ directive, compact }: PadDescriptionProps) {
  const { t } = useTranslations();
  return (
    <DescriptionParts
      compact={compact}
      primary={
        <span className="font-mono text-sm break-all">{directive.account}</span>
      }
      detail={
        <>
          {t("journal.fromAccount")} <span>{directive.source_account}</span>
        </>
      }
    />
  );
}
