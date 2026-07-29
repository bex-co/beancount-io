import type { JournalTransaction } from "@/common/types/journal";

interface TransactionDescriptionProps {
  directive: JournalTransaction;
}

export function TransactionDescription({
  directive,
}: TransactionDescriptionProps) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden px-1 sm:px-2">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
        {directive.payee && (
          <strong className="payee truncate text-sm">{directive.payee}</strong>
        )}
        {directive.payee && directive.narration && (
          <span className="separator hidden text-muted-foreground sm:inline">
            •
          </span>
        )}
        {directive.narration && (
          <span className="text-sm break-words">{directive.narration}</span>
        )}
      </div>
      {(directive.tags?.length > 0 || directive.links?.length > 0) && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {directive.tags.map((tag) => (
            <span key={tag} className="tag text-xs">
              #{tag}
            </span>
          ))}
          {directive.links.map((link) => (
            <span key={link} className="link text-xs">
              ^{link}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
