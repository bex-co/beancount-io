import type { JournalEvent } from "@/common/types/journal";

interface EventDescriptionProps {
  directive: JournalEvent;
}

export function EventDescription({ directive }: EventDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-medium text-sm">{directive.type}</div>
      <div className="text-sm text-muted-foreground break-words">
        {directive.description}
      </div>
    </div>
  );
}
