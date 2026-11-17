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
        {/* The payee takes its own direction, so an English one in Persian
            truncates at its end, not its start. Sized to the text on phones,
            it stays at the line's start edge in either direction; the
            narration keeps the full width it wraps in (w2/138). */}
        {directive.payee && (
          <strong
            dir="auto"
            className="payee max-w-full self-start truncate text-sm sm:self-auto"
          >
            {directive.payee}
          </strong>
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
