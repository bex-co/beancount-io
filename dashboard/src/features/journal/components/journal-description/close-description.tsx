import type { JournalClose } from "@/common/types/journal";
import { DescriptionParts } from "./description-parts";

interface CloseDescriptionProps {
  directive: JournalClose;
  compact?: boolean;
}

export function CloseDescription({
  directive,
  compact,
}: CloseDescriptionProps) {
  return (
    <DescriptionParts
      compact={compact}
      primary={
        <span className="font-mono text-sm break-all">{directive.account}</span>
      }
    />
  );
}
