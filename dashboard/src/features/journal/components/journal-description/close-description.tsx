import type { JournalClose } from "@/common/types/journal";

interface CloseDescriptionProps {
  directive: JournalClose;
}

export function CloseDescription({ directive }: CloseDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all cursor-pointer">
        {directive.account}
      </div>
    </div>
  );
}
