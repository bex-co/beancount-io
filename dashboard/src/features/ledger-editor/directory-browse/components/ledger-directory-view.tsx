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
import type { GetLedgerDirContentQuery } from "@/graphql/definitions";
import { cn } from "@/common/lib/utils/utils";
import { formatDateTime } from "@/common/lib/format";
import { useNavigate } from "@tanstack/react-router";
import { formatFileSize, getParentPath } from "../../shared/lib/utils";
import LedgerFileBreadcrumb from "../../shared/components/ledger-file-breadcrumb";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import LedgerCloneUrlMenu from "./ledger-clone-url-menu";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { ReadmeCard } from "@/common/components/readme-card";
import { Skeleton } from "@/common/components/ui/skeleton";

interface LedgerDirectoryViewProps {
  ledgerId: string;
  currentPath: string;
}

/**
 * Loading component for directory view
 */
const DirectoryLoading = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 sm:w-24" />
          <Skeleton className="h-8 w-8 sm:w-24" />
          <Skeleton className="h-8 w-8 sm:w-24" />
        </div>
      </div>
      <div className="border rounded-sm overflow-hidden">
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
const DirectoryError = ({ currentPath }: { currentPath?: string }) => {
  const { t } = useTranslations();
  return (
    <div>
      <div className="mb-4">
        <LedgerFileBreadcrumb type="dir" path={currentPath} />
      </div>
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {t("ledgerEditor.failedToLoadDirectory")}
          </p>
          <Button onClick={() => window.location.reload()}>
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
}: LedgerDirectoryViewProps) {
  const {
    data,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerDirContentDocument, {
    variables: {
      ledgerId: ledgerId,
      dirPath: currentPath || null,
    },
    skip: !ledgerId,
  });

  const dirContent = data?.getLedgerDirContent;
  const navigate = useNavigate();
  const fileNavigate = useFileNavigate();
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);

  const handleItemClick = (
    item: GetLedgerDirContentQuery["getLedgerDirContent"][number],
  ) => {
    fileNavigate(ledgerId, item.type as "file" | "dir", item.path);
  };

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

  if (isLoading) {
    return <DirectoryLoading />;
  }

  if (error) {
    return <DirectoryError currentPath={currentPath} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <LedgerFileBreadcrumb type="dir" path={currentPath} />
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex">
            <LedgerCloneUrlMenu ledgerId={ledgerId} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleVersionHistory}
            className="flex items-center gap-2"
          >
            <GitBranch className="h-4 w-4" />
            <span className="hidden md:inline">
              {t("commits.versionHistory")}
            </span>
          </Button>

          <LedgerWritePermission>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateFile}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">
                {t("ledgerEditor.createFile")}
              </span>
            </Button>
          </LedgerWritePermission>

          <LedgerWritePermission>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateFiles}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden md:inline">
                {t("ledgerEditor.uploadFiles")}
              </span>
            </Button>
          </LedgerWritePermission>

          {currentPath && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackClick}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden md:inline">{t("common.back")}</span>
            </Button>
          )}
        </div>
      </div>
      {!dirContent || dirContent.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("ledgerEditor.thisDirectoryIsEmpty")}
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-sm overflow-hidden">
          {[...dirContent]
            .sort((a, b) => {
              // First sort by type: directories first, then files
              if (a.type !== b.type) {
                return a.type === "dir" ? -1 : 1;
              }
              // Then sort alphabetically by name within each type
              return a.name.localeCompare(b.name);
            })
            .map((item, index) => (
              <div
                key={item.path}
                className={cn(
                  "flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0",
                  "hover:bg-accent cursor-pointer transition-colors",
                  index === 0 && "rounded-t-sm",
                  index === dirContent.length - 1 && "rounded-b-sm",
                )}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.type === "dir" ? (
                    <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground ml-2">
                  {item.type === "file" && (
                    <div className="hidden sm:flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
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
              </div>
            ))}
        </div>
      )}
      {readmeFile && (
        <div className="mt-4">
          <ReadmeCard ledgerId={ledgerId} path={readmeFile.path} />
        </div>
      )}
    </div>
  );
}
