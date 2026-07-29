import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useApolloClient } from "@apollo/client/react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  DeleteLedgerDocument,
  ListLedgersDocument,
  type GetLedgerQuery,
  type DeleteLedgerMutation,
  type DeleteLedgerMutationVariables,
  type ListLedgersQuery,
  type ListLedgersQueryVariables,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

export function DangerZoneSection({
  ledger,
  ledgerId,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
  ledgerId: string;
}) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [deleteLedger, { loading: deleting }] = useMutation<
    DeleteLedgerMutation,
    DeleteLedgerMutationVariables
  >(DeleteLedgerDocument);

  const handleDeleteLedger = async () => {
    if (!ledgerId || deleteConfirmText !== ledger?.name) return;

    try {
      await deleteLedger({ variables: { ledgerId } });
      toast.success(t("page.dashboard.ledgerDeletedSuccess"));

      const { data: ledgersData } = await apolloClient.query<
        ListLedgersQuery,
        ListLedgersQueryVariables
      >({
        query: ListLedgersDocument,
        fetchPolicy: "network-only",
      });

      const ledgers = ledgersData?.listLedgers || [];
      if (ledgers.length > 0) {
        const firstLedger = ledgers[0];
        const { ledgerOwner, ledgerName } = decodeLedgerId(firstLedger.id);
        void navigate({
          to: "/ledger/$ledgerOwner/$ledgerName",
          params: { ledgerOwner, ledgerName },
        });
      } else {
        void navigate({ to: "/auth/welcome" });
      }
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
    }
  };

  const deleteConfirmMatch = deleteConfirmText === ledger.name;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">
          {t("userSettings.dangerZone")}
        </CardTitle>
        <CardDescription>
          {t("page.settings.dangerZoneDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert variant="destructive" className="border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("page.settings.warning")}</AlertTitle>
            <AlertDescription>
              {t("page.settings.deleteLedgerWarning")}
            </AlertDescription>
          </Alert>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("page.dashboard.deleteLedger")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("page.dashboard.deleteLedger")}</DialogTitle>
                <DialogDescription>
                  {t("page.settings.deleteLedgerDialogDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <span>
                      {t("page.settings.deleteLedgerConfirmationPrefix")}{" "}
                      <strong>{ledger.name}</strong>{" "}
                      {t("page.settings.deleteLedgerConfirmationSuffix")}
                    </span>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirm">
                    {t("page.settings.typeToConfirm")}{" "}
                    <strong>{ledger.name}</strong>{" "}
                    {t("page.settings.toConfirm")}
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={ledger.name}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={deleting}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteLedger}
                  disabled={!deleteConfirmMatch || deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("page.dashboard.deleting")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("page.dashboard.deleteLedger")}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
