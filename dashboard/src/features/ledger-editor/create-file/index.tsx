import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@apollo/client/react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { MonacoEditor as Editor } from "@/common/components/monaco-editor";
import { X, Save } from "lucide-react";
import {
  CreateLedgerFileDocument,
  GetLedgerDirContentDocument,
} from "@/graphql/definitions";
import { registerBeancountLanguage } from "@/common/lib/editor/monaco-beancount-language";
import { createLedgerId, base64Encode } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { toast } from "sonner";
import { getFileLanguage } from "@/features/ledger-editor/shared/lib/utils";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

/**
 * Create File Page Component - GitHub-style file creation interface
 */
const CreateFilePage = () => {
  const params = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
  });
  const { ledgerOwner, ledgerName } = params;
  // The wildcard parameter captures the directory path after /new/{branch}/
  // TanStack Router uses "_splat" as the key for splat parameters
  const dirPath = params._splat || "";

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const navigate = useNavigate();
  const isDarkTheme = useIsDarkTheme();
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const { ledgerName: ledgerDisplayName } = useLedger();

  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [createFileMutation] = useMutation(CreateLedgerFileDocument);

  // Construct full file path
  const fullPath = dirPath ? `${dirPath}/${filename}` : filename;

  // Save button should be disabled if filename or content is empty
  const isSaveDisabled = !filename.trim() || isSaving;

  /**
   * Handle cancel button click - navigate back to files view
   */
  const handleCancel = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
      params: {
        ledgerOwner,
        ledgerName,
        branch: "main",
        _splat: dirPath || "",
      },
    });
  };

  /**
   * Handle save button click - create new file
   */
  const handleSave = async () => {
    if (isSaveDisabled) return;

    setIsSaving(true);
    try {
      await createFileMutation({
        variables: {
          ledgerId: ledgerId,
          path: fullPath,
          content: base64Encode(content), // Encode content to base64 with UTF-8 support
          message: t("ledgerEditor.createFileCommit", { path: fullPath }),
        },
        refetchQueries: [
          {
            query: GetLedgerDirContentDocument,
            variables: {
              ledgerId,
              dirPath: dirPath || null,
            },
          },
        ],
        awaitRefetchQueries: true,
      });

      // Navigate back to files view after successful creation
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        params: {
          ledgerOwner,
          ledgerName,
          branch: "main",
          _splat: dirPath || "",
        },
      });
    } catch (error) {
      console.error("Failed to create file:", error);
      toast.error(formatError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <LedgerPageSEO seoKey="ledgerFilesCreate" noIndex />
      <PageHeader
        title={t("ledgerEditor.createFile")}
        description={t("common.pageDescription.createFile", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      {/* Header Section */}
      <div className="border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left side: Directory path + filename input */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
              <span>{ledgerName}</span>
              {dirPath && (
                <>
                  <span>/</span>
                  <span className="truncate">{dirPath}</span>
                </>
              )}
              <span>/</span>
            </div>
            <Input
              type="text"
              placeholder={t("ledgerEditor.nameYourFile")}
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="flex-1 min-w-0"
              autoFocus
            />
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              <span>{t("common.cancel")}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? t("common.saving") : t("common.save")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Section */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="h-full">
            <Editor
              height="100%"
              language={getFileLanguage(filename)}
              value={content}
              onChange={(value) => setContent(value || "")}
              theme={isDarkTheme ? "vs-dark" : "light"}
              beforeMount={(monaco) => {
                // Register Beancount language before mounting
                registerBeancountLanguage(monaco);
              }}
              options={{
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                fontSize: 14,
                tabSize: 2,
                insertSpaces: true,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.files"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files`,
          },
          {
            label: t("common.relatedLinks.uploadFiles"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files/upload`,
          },
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
        ]}
      />
    </div>
  );
};

export default CreateFilePage;
