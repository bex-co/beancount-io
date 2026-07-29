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
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { toast } from "sonner";
import { Authenticated } from "@/common/components/authenticated";
import { useLedger } from "@/common/providers/ledger-provider";

interface LedgerCloneUrlMenuProps {
  ledgerId: string;
}

interface CloneUrlInputProps {
  url: string;
}

/**
 * Clone URL input component with copy button
 * Displays a read-only input field with URL and a copy button
 * Manages its own copy status internally
 */
function CloneUrlInput({ url }: CloneUrlInputProps) {
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
      <Input value={url} readOnly className="font-mono text-xs flex-1" />
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="shrink-0"
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
 * Ledger clone URL menu component
 * Displays a popover menu with HTTP and SSH clone URLs in GitHub style
 * Features tabs to switch between HTTPS and SSH, input with copy button, and footer actions
 */
export default function LedgerCloneUrlMenu({
  ledgerId,
}: LedgerCloneUrlMenuProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<string>("ssh");
  const { ledgerData } = useLedger();

  const { refetch: fetchArchiveUrl } = useQuery<
    GetLedgerArchiveDownloadUrlQuery,
    GetLedgerArchiveDownloadUrlQueryVariables
  >(GetLedgerArchiveDownloadUrlDocument, {
    variables: { ledgerId },
    skip: true,
  });

  const handleDownloadZip = async () => {
    const result = await fetchArchiveUrl({ ledgerId });
    const downloadUrl = result.data?.getLedgerArchiveDownloadUrl?.downloadUrl;
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const { httpUrl, sshUrl } = ledgerData;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="default" size="sm">
          <GitBranch className="mr-1 h-4 w-4" />
          Git Clone
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b">
            <h4 className="font-semibold text-sm">
              {t("ledgerEditor.cloneRepository")}
            </h4>
          </div>

          {/* Tabs and Input */}
          <div className="p-4 space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="https" className="text-xs">
                  HTTP
                </TabsTrigger>
                <TabsTrigger value="ssh" className="text-xs">
                  SSH
                </TabsTrigger>
              </TabsList>
              <TabsContent value="https">
                <CloneUrlInput url={httpUrl} />
              </TabsContent>
              <TabsContent value="ssh">
                <CloneUrlInput url={sshUrl} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3 space-y-1">
            <Authenticated>
              <Link
                to="/settings/ssh-keys"
                className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-accent transition-colors text-sm"
              >
                <KeyRound className="h-4 w-4" />
                <span>{t("ledgerEditor.manageSshKeys")}</span>
              </Link>
            </Authenticated>
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-accent transition-colors text-sm w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>{t("ledgerEditor.downloadZip")}</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
