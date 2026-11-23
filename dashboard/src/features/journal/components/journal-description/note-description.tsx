import type { JournalNote } from "@/common/types/journal";
import { DescriptionParts } from "./description-parts";

interface NoteDescriptionProps {
  directive: JournalNote;
  compact?: boolean;
}

export function NoteDescription({ directive, compact }: NoteDescriptionProps) {
  return (
    <DescriptionParts
      compact={compact}
      primary={<span className="text-sm break-words">{directive.comment}</span>}
    />
  );
}
