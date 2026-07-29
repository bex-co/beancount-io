import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@apollo/client/react";
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
import { Textarea } from "@/common/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import {
  UpdateLedgerDocument,
  type GetLedgerQuery,
  type UpdateLedgerMutation,
  type UpdateLedgerMutationVariables,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";

export function GeneralSettingsSection({
  ledger,
  ledgerId,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
  ledgerId: string;
}) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const navigate = useNavigate();
  const [ledgerName, setLedgerName] = useState(ledger.name || "");
  const [ledgerDescription, setLedgerDescription] = useState(
    ledger.description || "",
  );

  const [updateLedger, { loading: updatingLedger }] = useMutation<
    UpdateLedgerMutation,
    UpdateLedgerMutationVariables
  >(UpdateLedgerDocument);

  const previousLedgerNameRef = useRef(ledger.name);
  const previousLedgerDescriptionRef = useRef(ledger.description || "");

  useEffect(() => {
    if (previousLedgerNameRef.current !== ledger.name) {
      previousLedgerNameRef.current = ledger.name;
      queueMicrotask(() => setLedgerName(ledger.name || ""));
    }
  }, [ledger.name]);

  useEffect(() => {
    if (previousLedgerDescriptionRef.current !== ledger.description) {
      previousLedgerDescriptionRef.current = ledger.description || "";
      queueMicrotask(() => setLedgerDescription(ledger.description || ""));
    }
  }, [ledger.description]);

  const handleUpdateGeneral = async () => {
    if (!ledgerId) return;

    const variables: {
      ledgerId: string;
      name?: string;
      description?: string | null;
    } = { ledgerId };

    const hasNameChanges = ledgerName.trim() !== ledger.name;
    const hasDescriptionChanges =
      ledgerDescription !== (ledger.description || "");

    if (hasNameChanges && ledgerName.trim()) {
      variables.name = ledgerName.trim();
    }

    if (hasDescriptionChanges) {
      variables.description = ledgerDescription.trim() || null;
    }

    if (!hasNameChanges && !hasDescriptionChanges) {
      return;
    }

    try {
      const result = await updateLedger({ variables });

      if (hasNameChanges && result.data?.updateLedger) {
        const newLedgerId = result.data.updateLedger.id;
        const { ledgerOwner, ledgerName: newLedgerName } =
          decodeLedgerId(newLedgerId);
        void navigate({
          to: `/ledger/$ledgerOwner/$ledgerName/settings`,
          params: { ledgerOwner, ledgerName: newLedgerName },
          replace: true,
        });
      } else {
        toast.success(t("page.settings.settingsUpdated"));
      }

      if (result.data?.updateLedger) {
        previousLedgerNameRef.current = result.data.updateLedger.name;
        previousLedgerDescriptionRef.current =
          result.data.updateLedger.description || "";
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  const hasNameChanges = ledgerName.trim() !== ledger.name;
  const hasDescriptionChanges =
    ledgerDescription !== (ledger.description || "");
  const hasChanges = hasNameChanges || hasDescriptionChanges;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.settings.generalSettings")}</CardTitle>
        <CardDescription>
          {t("page.settings.generalSettingsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ledger-name">{t("page.dashboard.ledgerName")}</Label>
          <Input
            id="ledger-name"
            value={ledgerName}
            onChange={(e) => setLedgerName(e.target.value)}
            placeholder={t("page.dashboard.enterLedgerName")}
          />
          <p className="text-sm text-muted-foreground">
            {t("page.settings.ledgerNameDescription")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ledger-description">
            {t("page.settings.description")}
          </Label>
          <Textarea
            id="ledger-description"
            placeholder={t("page.settings.ledgerDescriptionPlaceholder")}
            value={ledgerDescription}
            onChange={(e) => setLedgerDescription(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            {t("page.settings.ledgerDescriptionDescription")}
          </p>
        </div>

        <LedgerAdminPermission>
          <div className="flex justify-end">
            <Button
              onClick={handleUpdateGeneral}
              disabled={!hasChanges || updatingLedger || !ledgerName.trim()}
            >
              {updatingLedger ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("common.save")}
                </>
              )}
            </Button>
          </div>
        </LedgerAdminPermission>
      </CardContent>
    </Card>
  );
}
