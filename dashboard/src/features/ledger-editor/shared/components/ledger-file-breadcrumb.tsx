import { Fragment } from "react";
import { ChevronRight, FolderOpen } from "lucide-react";
import { cn } from "@/common/lib/utils/utils";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslations } from "@/common/hooks/use-translations";

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
  const { t } = useTranslations();

  // Try to get params from new routes first, fallback to any route params
  const params = useParams({ strict: false });
  const ledgerOwner = params.ledgerOwner;
  const ledgerName = params.ledgerName;

  const derivedName = name ?? (path ? path.split("/").pop() || "" : "");

  const segments = (path || "").split("/").filter(Boolean);
  const directoryLink = (dirPath: string, label: string) => (
    <Link
      to="/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$"
      params={{
        ledgerOwner: ledgerOwner ?? "",
        ledgerName: ledgerName ?? "",
        branch: "main",
        _splat: dirPath,
      }}
      className="inline-flex min-h-6 min-w-6 items-center text-foreground hover:underline underline-offset-4 cursor-pointer"
    >
      {label}
    </Link>
  );

  // Directory breadcrumb: File / seg1 / seg2 ...
  if (type === "dir") {
    return (
      <div className={cn("flex items-center gap-2 min-w-0", className)}>
        <FolderOpen
          className="h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center gap-1">
          {directoryLink("", t("ledgerEditor.files"))}
          {segments.map((seg, idx) => {
            const dirPath = segments.slice(0, idx + 1).join("/");
            return (
              <Fragment key={dirPath}>
                {" "}
                <span className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  {directoryLink(dirPath, seg)}
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // File breadcrumb: File / ... / parentDir / filename
  const parentSegments = segments.slice(0, -1);
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <FolderOpen
        className="h-5 w-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="flex items-center gap-1 text-sm sm:text-base min-w-0">
        {directoryLink("", t("ledgerEditor.files"))}
        {parentSegments.map((seg, idx) => {
          const dirPath = parentSegments.slice(0, idx + 1).join("/");
          return (
            <Fragment key={dirPath}>
              {" "}
              <span className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                {directoryLink(dirPath, seg)}
              </span>
            </Fragment>
          );
        })}
        {derivedName && (
          <>
            {" "}
            <span className="flex items-center gap-1 min-w-0">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span dir="auto" className="truncate font-medium text-foreground">
                {derivedName}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
