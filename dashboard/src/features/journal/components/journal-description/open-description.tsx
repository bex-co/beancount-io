import type { JournalOpen } from "@/common/types/journal";

interface OpenDescriptionProps {
  directive: JournalOpen;
}

export function OpenDescription({ directive }: OpenDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all cursor-pointer">
        {directive.account}
      </div>
    </div>
  );
}
