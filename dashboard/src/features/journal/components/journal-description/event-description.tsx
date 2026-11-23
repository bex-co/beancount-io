import type { JournalEvent } from "@/common/types/journal";
import { DescriptionParts } from "./description-parts";

interface EventDescriptionProps {
  directive: JournalEvent;
  compact?: boolean;
}

export function EventDescription({
  directive,
  compact,
}: EventDescriptionProps) {
  return (
    <DescriptionParts
      compact={compact}
      primary={<span className="text-sm font-medium">{directive.type}</span>}
      detail={directive.description && <span>{directive.description}</span>}
    />
  );
}
