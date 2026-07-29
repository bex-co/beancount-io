import { useNavigate, useParams } from "@tanstack/react-router";
import { Plus, FileEdit, Sparkles, Link, ScanLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu.tsx";
import { Button } from "@/common/components/ui/button.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { NEW_TRANSACTION_ACTION_SEARCH } from "@/common/lib/ledger-action-search";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";

/**
 * Import dropdown component
 * Provides quick access to manual and smart import features
 */
export function ImportDropdown() {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { canWrite } = useLedgerPermission();

  // Get ledger params from URL
  const params = useParams({ strict: false });
  const ledgerOwner = params.ledgerOwner as string;
  const ledgerName = params.ledgerName as string;

  const handleManualImport = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/journal",
      params: { ledgerOwner, ledgerName },
      search: NEW_TRANSACTION_ACTION_SEARCH,
    });
  };

  const handleSmartImport = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/import",
      params: {
        ledgerOwner,
        ledgerName,
      },
    });
  };

  const handleUploadReceipt = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/receipt",
      params: {
        ledgerOwner,
        ledgerName,
      },
    });
  };

  const handleLinkImport = () => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/link",
      params: {
        ledgerOwner,
        ledgerName,
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex h-8 w-8 rounded-full hover:bg-accent data-[state=open]:bg-accent"
          aria-label={t("common.import")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canWrite ? (
          <DropdownMenuItem onClick={handleManualImport}>
            <FileEdit className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>{t("common.manualImport")}</span>
              <span className="text-xs text-muted-foreground">
                {t("common.manualImportDesc")}
              </span>
            </div>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={handleSmartImport}>
          <Sparkles className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>{t("common.smartImport")}</span>
            <span className="text-xs text-muted-foreground">
              {t("common.smartImportDesc")}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleUploadReceipt}>
          <ScanLine className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>{t("common.uploadReceipt")}</span>
            <span className="text-xs text-muted-foreground">
              {t("common.uploadReceiptDesc")}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLinkImport}>
          <Link className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>{t("common.linkImport")}</span>
            <span className="text-xs text-muted-foreground">
              {t("common.linkImportDesc")}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
