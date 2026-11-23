import type { JournalOpen } from "@/common/types/journal";
import { DescriptionParts } from "./description-parts";

interface OpenDescriptionProps {
  directive: JournalOpen;
  compact?: boolean;
}

export function OpenDescription({ directive, compact }: OpenDescriptionProps) {
  return (
    <DescriptionParts
      compact={compact}
      primary={
        <span className="font-mono text-sm break-all">{directive.account}</span>
      }
    />
  );
}
