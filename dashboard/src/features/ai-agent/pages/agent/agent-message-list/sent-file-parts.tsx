import { type FileUIPart } from "ai";
import { FileImage, FileText } from "lucide-react";
import type { AgentUIMessage } from "./agent-message-list";
import { useTranslations } from "@/common/hooks/use-translations";

export function SentFileParts({ parts }: { parts: AgentUIMessage["parts"] }) {
  const { t } = useTranslations();
  const fileParts = parts.filter((p) => p.type === "file") as FileUIPart[];
  if (fileParts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {fileParts.map((fp, i) => {
        const isImage = fp.mediaType.startsWith("image/");
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/70 px-2 py-1 text-xs text-foreground"
          >
            {isImage ? (
              <FileImage className="h-3.5 w-3.5 shrink-0 opacity-70" />
            ) : (
              <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
            )}
            <span className="max-w-45 truncate">
              {fp.filename ?? t("aiAgent.attachment")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
