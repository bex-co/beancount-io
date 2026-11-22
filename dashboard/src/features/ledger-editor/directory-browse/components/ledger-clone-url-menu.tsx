import { useQuery } from "@apollo/client/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/common/components/ui/tabs";
import {
  GetLedgerArchiveDownloadUrlDocument,
  type GetLedgerArchiveDownloadUrlQuery,
  type GetLedgerArchiveDownloadUrlQueryVariables,
} from "@/graphql/definitions";
import { GitBranch, Copy, Check, KeyRound, Download } from "lucide-react";
import { useState, useEffect, useId, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { toast } from "sonner";
import { Authenticated } from "@/common/components/authenticated";
import { useLedger } from "@/common/providers/ledger-provider";
import { useDeploymentInfo } from "@/common/hooks/use-deployment-info";

interface LedgerCloneUrlMenuProps {
  ledgerId: string;
}

interface CloneUrlInputProps {
  url: string;
  copyLabel: string;
  /**
   * Elements that name this field — its protocol tab and the popup heading, so
   * the two URL boxes read as "HTTP Clone Repository" and "SSH Clone
   * Repository". The copy button's label names the action, not the field, and
   * the URL itself is the value rather than the name.
   */
  labelledBy: string;
}

/**
 * Clone URL input component with copy button
 * Displays a read-only input field with URL and a copy button
 * Manages its own copy status internally
 */
export function CloneUrlInput({
  url,
  copyLabel,
  labelledBy,
}: CloneUrlInputProps) {
  const formatError = useErrorMessage();
  const [copied, setCopied] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      toast.error(formatError(err));
    }
  };

  return (
    <div className="flex gap-2 flex-row items-center">
      <Input
        value={url}
        readOnly
        aria-labelledby={labelledBy}
        className="font-mono text-xs flex-1"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="shrink-0"
        aria-label={copyLabel}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

/**
 * What Git needs to sign in over HTTPS, under the HTTP clone URL.
 *
 * Git asks for a password there; the account password is being phased out on
 * that endpoint in favor of a token (w3/m68). A self-hosted server also signs
 * Git in through bea (w22/m12), so there the command comes first; the managed
 * service keeps SSH keys for that. Its own component so the deployment is
 * asked only once someone opens the HTTP tab, not on every ledger page.
 */
function HttpsCredentialHint() {
  const { t } = useTranslations();
  const { selfHost } = useDeploymentInfo();
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {selfHost && (
        <>
          {t("ledgerEditor.httpsBeaHint", {
            command: "bea cloud git setup",
          })}{" "}
        </>
      )}
      {t("ledgerEditor.httpsCredentialHint")}{" "}
      <Authenticated>
        <Link
          to="/settings/api-keys"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {t("ledgerEditor.createAccessToken")}
        </Link>
      </Authenticated>
    </p>
  );
}

/**
 * Ledger clone URL menu component
 * Displays a popover menu with HTTP and SSH clone URLs in GitHub style
 * Features tabs to switch between HTTPS and SSH, input with copy button, and footer actions
 */
export default function LedgerCloneUrlMenu({
  ledgerId,
}: LedgerCloneUrlMenuProps) {
  const { t } = useTranslations();
  const headingId = useId();
  const httpTabId = useId();
  const sshTabId = useId();
  const formatError = useErrorMessage();
  const { ledgerData } = useLedger();
  const { httpUrl, sshUrl } = ledgerData;
  // A deployment that serves no Git over SSH returns no SSH address (w1/m46):
  // offer only what works there, rather than an address nothing answers.
  const [activeTab, setActiveTab] = useState<string>("ssh");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  /**
   * The archive URL, kept only when the browser refused to open it for us.
   *
   * Discovery is a round trip, so by the time it answers the click that
   * started it may no longer count as a user gesture and `window.open` returns
   * null without throwing. The lookup succeeded, so the URL is good — offer it
   * as a plain link the reader can activate with a fresh gesture instead of
   * silently re-enabling the button and saying nothing.
   */
  const [blockedDownloadUrl, setBlockedDownloadUrl] = useState<string | null>(
    null,
  );
  const { refetch: fetchArchiveUrl } = useQuery<
    GetLedgerArchiveDownloadUrlQuery,
    GetLedgerArchiveDownloadUrlQueryVariables
  >(GetLedgerArchiveDownloadUrlDocument, {
    variables: { ledgerId },
    skip: true,
  });

  const handleDownloadZip = async () => {
    // Archive discovery can reject (transport or server error). Without this the
    // rejection became an unhandled promise and the popover said nothing.
    setDownloadError(null);
    setBlockedDownloadUrl(null);
    setDownloading(true);
    try {
      const result = await fetchArchiveUrl({ ledgerId });
      const downloadUrl = result.data?.getLedgerArchiveDownloadUrl?.downloadUrl;
      if (!downloadUrl) {
        setDownloadError(t("ledgerEditor.downloadZipFailed"));
        return;
      }
      if (!window.open(downloadUrl, "_blank")) {
        setBlockedDownloadUrl(downloadUrl);
      }
    } catch (err) {
      console.error("Failed to prepare ZIP download:", err);
      setDownloadError(formatError(err) || t("ledgerEditor.downloadZipFailed"));
    } finally {
      // Always re-enable so the user can retry.
      setDownloading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="pointer-coarse:min-h-11 pointer-coarse:px-4"
        >
          <GitBranch className="mr-1 h-4 w-4" />
          {t("ledgerEditor.gitClone")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0"
        // Radix gives this popup role="dialog"; point it at the heading that
        // is already on screen rather than inventing a second name.
        aria-labelledby={headingId}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b">
            <h4 id={headingId} className="font-semibold text-sm">
              {t("ledgerEditor.cloneRepository")}
            </h4>
          </div>

          {/* Tabs and Input */}
          <div className="p-4 space-y-3">
            <Tabs
              value={sshUrl ? activeTab : "https"}
              onValueChange={setActiveTab}
            >
              <TabsList
                className={`grid w-full ${sshUrl ? "grid-cols-2" : "grid-cols-1"}`}
              >
                <TabsTrigger value="https" className="text-xs">
                  <span id={httpTabId}>HTTP</span>
                </TabsTrigger>
                {sshUrl && (
                  <TabsTrigger value="ssh" className="text-xs">
                    <span id={sshTabId}>SSH</span>
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="https">
                <CloneUrlInput
                  url={httpUrl}
                  copyLabel={t("ledgerEditor.copyHttpCloneUrl")}
                  labelledBy={`${httpTabId} ${headingId}`}
                />
                <HttpsCredentialHint />
              </TabsContent>
              {sshUrl && (
                <TabsContent value="ssh">
                  <CloneUrlInput
                    url={sshUrl}
                    copyLabel={t("ledgerEditor.copySshCloneUrl")}
                    labelledBy={`${sshTabId} ${headingId}`}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3 space-y-1">
            {sshUrl && (
              <Authenticated>
                <Link
                  to="/settings/ssh-keys"
                  className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-accent transition-colors text-sm"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{t("ledgerEditor.manageSshKeys")}</span>
                </Link>
              </Authenticated>
            )}
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-accent transition-colors text-sm w-full text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>{t("ledgerEditor.downloadZip")}</span>
            </button>
            {downloadError && (
              <p role="alert" className="px-2 text-xs text-destructive">
                {downloadError}
              </p>
            )}
            {blockedDownloadUrl && (
              <div role="status" className="space-y-1 px-2">
                <p className="text-xs text-muted-foreground">
                  {t("ledgerEditor.downloadZipBlocked")}
                </p>
                <a
                  href={blockedDownloadUrl}
                  download
                  className="flex items-center gap-2 rounded-md py-2 text-sm underline underline-offset-2 hover:bg-accent"
                >
                  <Download className="h-4 w-4" />
                  <span>{t("ledgerEditor.downloadZip")}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
