import type { JournalNote } from "@/common/types/journal";

interface NoteDescriptionProps {
  directive: JournalNote;
}

export function NoteDescription({ directive }: NoteDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="text-sm break-words">{directive.comment}</div>
    </div>
  );
}
