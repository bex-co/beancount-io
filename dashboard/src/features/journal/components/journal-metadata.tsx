import type { JournalDirectiveType } from "@/common/types/journal";

interface JournalMetadataProps {
  directive: JournalDirectiveType;
  showMetadata: boolean;
}

export function JournalMetadata({
  directive,
  showMetadata,
}: JournalMetadataProps) {
  if (
    !showMetadata ||
    !directive.meta ||
    Object.keys(directive.meta).length === 0
  )
    return null;

  // Filter out internal metadata keys
  const filteredEntries = Object.entries(directive.meta).filter(([key]) => {
    return (
      !key.startsWith("__") &&
      !key.startsWith("filename") &&
      !key.startsWith("lineno")
    );
  });

  if (filteredEntries.length === 0) return null;

  return (
    <ul className="metadata bg-muted/50 text-sm">
      {filteredEntries.map(([key, value]) => (
        <li key={key} className="border-b border-border/50">
          <div className="flex items-center py-1">
            <span className="w-32 sm:w-48"></span>
            <span className="text-center px-2 text-muted-foreground text-xs sm:text-sm">
              {key}
            </span>
            <span className="flex-1 px-1 sm:px-2 text-xs sm:text-sm break-words">
              {typeof value === "string" ? value : JSON.stringify(value)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
