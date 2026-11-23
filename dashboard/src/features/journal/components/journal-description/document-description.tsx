import type { JournalDocument } from "@/common/types/journal";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { createLedgerId } from "@/common/lib/utils/encode";

interface DocumentDescriptionProps {
  directive: JournalDocument;
  ledgerOwner?: string;
  ledgerName?: string;
}

function DocumentFileButton({
  ledgerId,
  path,
  filename,
}: {
  ledgerId: string;
  path: string;
  filename: string;
}) {
  const fileNavigate = useFileNavigate();
  return (
    <button
      type="button"
      dir="auto"
      title={path}
      className="max-w-full rounded-sm text-start text-sm text-primary underline underline-offset-2 [overflow-wrap:anywhere] hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]"
      onClick={(event) => {
        event.stopPropagation();
        fileNavigate(ledgerId, "file", path);
      }}
    >
      {filename}
    </button>
  );
}

export function DocumentDescription({
  directive,
  ledgerOwner,
  ledgerName,
}: DocumentDescriptionProps) {
  const filename = directive.filename.split("/").pop() || directive.filename;
  return (
    <div className="min-w-0 flex-1 px-2">
      <div className="font-mono text-sm break-all">{directive.account}</div>
      {ledgerOwner && ledgerName ? (
        <DocumentFileButton
          ledgerId={createLedgerId(ledgerOwner, ledgerName)}
          path={directive.filename}
          filename={filename}
        />
      ) : (
        <span dir="auto" className="text-sm [overflow-wrap:anywhere]">
          {filename}
        </span>
      )}
      {(directive.tags.length > 0 || directive.links.length > 0) && (
        <div className="mt-1 flex cursor-default flex-wrap gap-1">
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
