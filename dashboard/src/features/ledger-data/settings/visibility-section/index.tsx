import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation } from "@apollo/client/react";
import { cn } from "@/common/lib/utils/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Switch } from "@/common/components/ui/switch";
import { Textarea } from "@/common/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import {
  GetLedgerDocument,
  UpdateLedgerDocument,
  type GetLedgerQuery,
  type UpdateLedgerMutation,
  type UpdateLedgerMutationVariables,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";

function buildEmbedCode(
  shareableUrl: string,
  ledgerName: string,
  viewOnBeancountLabel: string,
): string {
  return `<div style="position: relative; padding-bottom: 75%; height: 0; overflow: hidden; max-width: 100%; margin-bottom: 2rem;">
  <iframe
    src="${shareableUrl}"
    style="position: absolute; top: 0; left: 0; width: 166.667%; height: 166.667%; transform: scale(0.6); transform-origin: top left; border: none;"
    title="${ledgerName}"
    frameborder="0"
    loading="lazy">
  </iframe>
  <a
    href="${shareableUrl}"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="${viewOnBeancountLabel}"
    style="position: absolute; bottom: 12px; left: 12px; z-index: 10; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(0, 0, 0, 0.8); color: white; font-size: 13px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.3px; transition: background 0.2s ease;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
    <span>${viewOnBeancountLabel}</span>
  </a>
</div>`;
}

// The page origin only exists in the browser: SSR has no `window`, and reading
// it during the first client render would break hydration. The origin never
// changes for a mounted page, so the store needs no subscription — React reads
// the server snapshot for the SSR and hydration passes, then the real origin.
const subscribeToOrigin = () => () => {};
const getOriginSnapshot = () => window.location.origin;
const getOriginServerSnapshot = () => "";

export function VisibilitySection({
  ledger,
  ledgerId,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
  ledgerId: string;
}) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [isPrivate, setIsPrivate] = useState(ledger.private);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    getOriginSnapshot,
    getOriginServerSnapshot,
  );
  const copiedUrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedUrlTimerRef.current) clearTimeout(copiedUrlTimerRef.current);
      if (copiedCodeTimerRef.current) clearTimeout(copiedCodeTimerRef.current);
    };
  }, []);

  const [updateLedgerVisibility, { loading: updatingVisibility }] = useMutation<
    UpdateLedgerMutation,
    UpdateLedgerMutationVariables
  >(UpdateLedgerDocument);

  const previousIsPrivateRef = useRef(ledger.private);

  useEffect(() => {
    if (previousIsPrivateRef.current !== ledger.private) {
      previousIsPrivateRef.current = ledger.private;
      queueMicrotask(() => setIsPrivate(ledger.private ?? false));
    }
  }, [ledger.private]);

  const handleVisibilityChange = async (checked: boolean) => {
    if (!ledgerId) return;
    setIsPrivate(checked);
    try {
      await updateLedgerVisibility({
        variables: { ledgerId, private: checked },
        awaitRefetchQueries: true,
        refetchQueries: [{ query: GetLedgerDocument, variables: { ledgerId } }],
      });
    } catch (error) {
      setIsPrivate(!checked);
      toast.error(formatError(error));
    }
  };

  const shareableUrl = `${origin}/ledger/${ledger.fullName}`;
  const embedCode = buildEmbedCode(
    shareableUrl,
    ledger.name,
    t("page.settings.embedViewOnBeancount"),
  );

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedUrl(true);
      toast.success(t("page.settings.copied"));
      if (copiedUrlTimerRef.current) clearTimeout(copiedUrlTimerRef.current);
      copiedUrlTimerRef.current = setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast.error(t("page.settings.copyUrlFailed"));
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedCode(true);
      toast.success(t("page.settings.copied"));
      if (copiedCodeTimerRef.current) clearTimeout(copiedCodeTimerRef.current);
      copiedCodeTimerRef.current = setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error(t("page.settings.copyCodeFailed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.settings.visibility")}</CardTitle>
        <CardDescription>
          {t("page.settings.visibilityDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-base">
                {isPrivate
                  ? t("page.settings.privateLedger")
                  : t("page.settings.publicLedger")}
              </Label>
            </div>
            <p
              className={cn(
                "text-sm",
                isPrivate ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {isPrivate
                ? t("page.settings.privateLedgerDescription")
                : t("page.settings.publicLedgerDescription")}
            </p>
          </div>
          <LedgerAdminPermission>
            <Switch
              id="visibility-toggle"
              checked={isPrivate}
              onCheckedChange={handleVisibilityChange}
              disabled={updatingVisibility}
              className={
                !isPrivate ? "data-[state=unchecked]:bg-destructive" : undefined
              }
            />
          </LedgerAdminPermission>
        </div>
        {!isPrivate && (
          <div className="border-t pt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-1">
                {t("page.settings.sharing")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("page.settings.sharingDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shareable-url">
                {t("page.settings.shareableUrl")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="shareable-url"
                  value={shareableUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  {copiedUrl ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="embed-code">{t("page.settings.embedCode")}</Label>
              <div className="flex gap-2">
                <Textarea
                  id="embed-code"
                  value={embedCode}
                  readOnly
                  rows={6}
                  className="font-mono text-xs resize-none"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="shrink-0"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("page.settings.embedCodeDescription")}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
