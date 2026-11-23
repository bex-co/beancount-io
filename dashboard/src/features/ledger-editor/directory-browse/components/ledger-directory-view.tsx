import { useQuery } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import {
  FileText,
  Folder,
  ArrowLeft,
  Calendar,
  HardDrive,
  Plus,
  Upload,
  GitBranch,
} from "lucide-react";
import { GetLedgerDirContentDocument } from "@/graphql/definitions";
import { cn } from "@/common/lib/utils/utils";
import { formatDateTime } from "@/common/lib/format";
import { Link, useNavigate } from "@tanstack/react-router";
import { formatFileSize, getParentPath } from "../../shared/lib/utils";
import LedgerFileBreadcrumb from "../../shared/components/ledger-file-breadcrumb";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import LedgerCloneUrlMenu from "./ledger-clone-url-menu";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { ReadmeCard } from "@/common/components/readme-card";
import { Skeleton } from "@/common/components/ui/skeleton";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { isMissingDirectory } from "../../shared/lib/surviving-directory";
import { DirectoryNotFoundView } from "../not-found";

interface LedgerDirectoryViewProps {
  ledgerId: string;
  currentPath: string;
  initialReadFailed?: boolean;
}

const DirectoryHeading = ({
  currentPath,
  subtitle,
}: {
  currentPath?: string;
  subtitle?: string;
}) => (
  <div className="min-w-0">
    <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
      <LedgerFileBreadcrumb type="dir" path={currentPath} />
    </h1>
    {subtitle && (
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
    )}
  </div>
);

/**
 * Loading component for directory view
 */
const DirectoryLoading = ({ currentPath }: { currentPath: string }) => {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DirectoryHeading currentPath={currentPath} />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 sm:w-24" />
          <Skeleton className="h-8 w-8 sm:w-24" />
          <Skeleton className="h-8 w-8 sm:w-24" />
        </div>
      </div>
      <div className="overflow-clip rounded-xl border bg-card shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0"
          >
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-5 w-5 shrink-0" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="hidden sm:block h-4 w-14" />
              <Skeleton className="hidden md:block h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Error component for directory view
 */
const DirectoryError = ({
  currentPath,
  retry,
  retrying,
}: {
  currentPath: string;
  retry: () => void;
  retrying: boolean;
}) => {
  const { t } = useTranslations();
  return (
    <div>
      <div className="mb-4">
        <DirectoryHeading currentPath={currentPath} />
      </div>
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p role="alert" className="text-destructive mb-4">
            {t("ledgerEditor.failedToLoadDirectory")}
          </p>
          <Button type="button" onClick={retry} loading={retrying}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Directory view component for displaying folder contents
 */
export default function LedgerDirectoryView({
  ledgerId,
  currentPath,
  initialReadFailed = false,
}: LedgerDirectoryViewProps) {
  const {
    data,
    loading: isLoading,
    error,
    refetch,
  } = useQuery(GetLedgerDirContentDocument, {
    variables: {
      ledgerId: ledgerId,
      dirPath: currentPath || null,
    },
    skip: !ledgerId,
  });
  const { failure, retry, retrying } = useQueryRetry(
    error ?? (initialReadFailed && !data ? true : undefined),
    refetch,
    `${ledgerId}/${currentPath}`,
  );

  const dirContent = data?.getLedgerDirContent;
  const navigate = useNavigate();
  const fileNavigate = useFileNavigate();
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);
  const branch = "main";

  const handleBackClick = () => {
    if (currentPath) {
      fileNavigate(ledgerId, "dir", getParentPath(currentPath));
    }
  };

  const handleCreateFile = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
      params: {
        ledgerOwner,
        ledgerName,
        branch: "main",
        _splat: currentPath,
      },
    });
  };

  const handleUpdateFiles = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/files/upload/$branch/$",
      params: {
        ledgerOwner,
        ledgerName,
        branch: "main",
        _splat: currentPath,
      },
      search: {},
    });
  };

  const handleVersionHistory = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/commits",
      params: {
        ledgerOwner,
        ledgerName,
      },
    });
  };

  const readmeFile = dirContent?.find(
    (item) => item.type === "file" && item.name.toLowerCase() === "readme.md",
  );

  if (isMissingDirectory(error)) {
    return (
      <DirectoryNotFoundView
        ledgerOwner={ledgerOwner}
        ledgerName={ledgerName}
        dirPath={currentPath}
      />
    );
  }
  if (failure) {
    return (
      <DirectoryError
        currentPath={currentPath}
        retry={retry}
        retrying={retrying}
      />
    );
  }
  if (isLoading) {
    return <DirectoryLoading currentPath={currentPath} />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DirectoryHeading currentPath={currentPath} subtitle={ledgerName} />
        <div className="flex flex-wrap items-center gap-2">
          <LedgerWritePermission>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateFile}
              className="flex items-center gap-1.5 pointer-coarse:min-h-11 pointer-coarse:px-4"
              aria-label={t("ledgerEditor.createFile")}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t("ledgerEditor.createFile")}</span>
            </Button>
          </LedgerWritePermission>

          <LedgerWritePermission>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateFiles}
              className="flex items-center gap-1.5 pointer-coarse:min-h-11 pointer-coarse:px-4"
              aria-label={t("ledgerEditor.uploadFiles")}
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span>{t("ledgerEditor.uploadFiles")}</span>
            </Button>
          </LedgerWritePermission>

          <Button
            variant="outline"
            size="sm"
            onClick={handleVersionHistory}
            className="flex items-center gap-1.5 pointer-coarse:min-h-11 pointer-coarse:px-4"
            aria-label={t("commits.versionHistory")}
          >
            <GitBranch className="h-4 w-4 shrink-0" />
            <span>{t("commits.versionHistory")}</span>
          </Button>

          <LedgerCloneUrlMenu ledgerId={ledgerId} />

          {currentPath && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackClick}
              className="flex items-center gap-1.5 pointer-coarse:min-h-11 pointer-coarse:px-4"
              aria-label={t("common.back")}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{t("common.back")}</span>
            </Button>
          )}
        </div>
      </div>
      {!dirContent || dirContent.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-12 shadow-sm">
          <div className="text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("ledgerEditor.thisDirectoryIsEmpty")}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-clip rounded-xl border bg-card shadow-sm">
          {[...dirContent]
            .sort((a, b) => {
              // First sort by type: directories first, then files
              if (a.type !== b.type) {
                return a.type === "dir" ? -1 : 1;
              }
              // Then by name within each type, numbers by value, so
              // "qa-2.bean" lists before "qa-10.bean" (w21/658)
              return a.name.localeCompare(b.name, undefined, {
                numeric: true,
              });
            })
            .map((item) => (
              <Link
                key={item.path}
                to={
                  item.type === "dir"
                    ? "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$"
                    : "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$"
                }
                params={{
                  ledgerOwner,
                  ledgerName,
                  branch,
                  _splat: item.path,
                }}
                className={cn(
                  "flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0",
                  "hover:bg-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]",
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.type === "dir" ? (
                    <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      dir="auto"
                      className="w-fit max-w-full font-medium truncate"
                    >
                      {item.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground ml-2 tabular-nums">
                  {item.type === "file" && (
                    <div className="flex items-center gap-1">
                      <HardDrive className="hidden sm:block h-4 w-4" />
                      <span className="whitespace-nowrap">
                        {formatFileSize(item.size)}
                      </span>
                    </div>
                  )}
                  {formatDateTime(item.lastCommitterDate) && (
                    <div className="hidden md:flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className="whitespace-nowrap">
                        {formatDateTime(item.lastCommitterDate)}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
        </div>
      )}
      {readmeFile && (
        <div className="mt-4">
          <ReadmeCard
            ledgerId={ledgerId}
            path={readmeFile.path}
            headingOffset={1}
          />
        </div>
      )}
    </div>
  );
}
