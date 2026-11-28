import type { JournalQuery } from "@/common/types/journal";
import { DescriptionParts } from "./description-parts";

interface QueryDescriptionProps {
  directive: JournalQuery;
  compact?: boolean;
}

export function QueryDescription({
  directive,
  compact,
}: QueryDescriptionProps) {
  return (
    <DescriptionParts
      compact={compact}
      primary={<span className="text-sm font-medium">{directive.name}</span>}
      detail={
        directive.query_string && (
          <span className="font-mono text-xs break-all">
            {directive.query_string}
          </span>
        )
      }
    />
  );
}
