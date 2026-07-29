import type { JournalDocument } from "@/common/types/journal";

interface DocumentDescriptionProps {
  directive: JournalDocument;
}

export function DocumentDescription({ directive }: DocumentDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all">{directive.account}</div>
      <div className="filename text-sm cursor-pointer">
        {directive.filename.split("/").pop()}
      </div>
      {(directive.tags.length > 0 || directive.links.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {directive.tags.map((tag) => (
            <span key={tag} className="tag text-xs cursor-pointer">
              #{tag}
            </span>
          ))}
          {directive.links.map((link) => (
            <span key={link} className="link text-xs cursor-pointer">
              ^{link}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
