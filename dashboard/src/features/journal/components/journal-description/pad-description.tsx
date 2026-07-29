import type { JournalPad } from "@/common/types/journal";

interface PadDescriptionProps {
  directive: JournalPad;
}

export function PadDescription({ directive }: PadDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all cursor-pointer">
        {directive.account}
      </div>
      <div className="text-sm text-muted-foreground">
        from <span className="cursor-pointer">{directive.source_account}</span>
      </div>
    </div>
  );
}
