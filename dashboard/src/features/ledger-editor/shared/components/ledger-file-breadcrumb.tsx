import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/common/lib/utils/utils";
import { useParams } from "@tanstack/react-router";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { createLedgerId } from "@/common/lib/utils/encode";

interface LedgerFileBreadcrumbProps {
  type: "file" | "dir";
  name?: string;
  path?: string;
  className?: string;
}

export default function LedgerFileBreadcrumb({
  type,
  name,
  path,
  className,
}: LedgerFileBreadcrumbProps) {
  const fileNavigate = useFileNavigate();

  // Try to get params from new routes first, fallback to any route params
  const params = useParams({ strict: false });
  const ledgerOwner = params.ledgerOwner;
  const ledgerName = params.ledgerName;

  const derivedName = name ?? (path ? path.split("/").pop() || "" : "");

  const segments = (path || "").split("/").filter(Boolean);
  const ledgerId = createLedgerId(ledgerOwner ?? "", ledgerName ?? "");

  const handleNavigateDir = (dirPath: string) => {
    fileNavigate(ledgerId, "dir", dirPath);
  };

  // Directory breadcrumb: File / seg1 / seg2 ...
  if (type === "dir") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Home className="h-5 w-5" />
        <div className="flex items-center gap-1 text-sm sm:text-base">
          <button
            type="button"
            className="text-foreground hover:underline cursor-pointer"
            onClick={() => handleNavigateDir("")}
          >
            File
          </button>
          {segments.map((seg, idx) => {
            const dirPath = segments.slice(0, idx + 1).join("/");
            return (
              <span key={dirPath} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  className="text-foreground hover:underline cursor-pointer"
                  onClick={() => handleNavigateDir(dirPath)}
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // File breadcrumb: File / ... / parentDir / filename
  const parentSegments = segments.slice(0, -1);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Home className="h-5 w-5" />
      <div className="flex items-center gap-1 text-sm sm:text-base min-w-0">
        <button
          type="button"
          className="text-foreground hover:underline cursor-pointer"
          onClick={() => handleNavigateDir("")}
        >
          File
        </button>
        {parentSegments.map((seg, idx) => {
          const dirPath = parentSegments.slice(0, idx + 1).join("/");
          return (
            <span key={dirPath} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                className="text-foreground hover:underline cursor-pointer"
                onClick={() => handleNavigateDir(dirPath)}
              >
                {seg}
              </button>
            </span>
          );
        })}
        {derivedName && (
          <span className="flex items-center gap-1 min-w-0">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="truncate font-medium text-foreground">
              {derivedName}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
