import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
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
  DeleteAccountDocument,
  GetCurrentUserDocument,
  type DeleteAccountMutation,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";
import { Input } from "@/common/components/ui/input";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";

/**
 * Danger zone section component
 * Handles destructive actions like account deletion
 */
export function DangerZoneSection() {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const navigate = useNavigate();
  const cacheClear = useApolloCacheClear();

  const { data: userData } = useQuery<GetCurrentUserQuery>(
    GetCurrentUserDocument,
    { fetchPolicy: "cache-first" },
  );
  const username = userData?.userProfile?.username ?? "";

  const [deleteAccount, { loading: isDeleting }] =
    useMutation<DeleteAccountMutation>(DeleteAccountDocument, {
      onCompleted: () => {
        cacheClear();
        setIsDeleteDialogOpen(false);
        setConfirmUsername("");
        toast.success(t("userSettings.accountDeleted"));
        void navigate({ to: "/auth/login" });
      },
      onError: (error) => {
        toast.error(formatError(error));
      },
    });

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error) {
      // Error is handled by onError callback
      console.error("Delete account error:", error);
    }
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {t("userSettings.dangerZone")}
        </CardTitle>
        <CardDescription>
          {t("userSettings.irreversibleActions")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delete Account */}
        <div className="flex items-start flex-col lg:flex-row justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("userSettings.deleteAccount")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("userSettings.deleteAccountWarning")}
            </p>
          </div>
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) setConfirmUsername("");
            }}
          >
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0">
                <Trash2 className="h-4 w-4 mr-2" />
                {t("userSettings.deleteAccount")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {t("userSettings.deleteAccountQuestion")}
                </DialogTitle>
                <DialogDescription>
                  {t("userSettings.deleteAccountDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                  <h4 className="font-semibold text-sm mb-3">
                    {t("userSettings.followingWillBeDeleted")}
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5 ml-4">
                    <li className="list-disc">
                      {t("userSettings.allLedgersAndTransactions")}
                    </li>
                    <li className="list-disc">
                      {t("userSettings.allDocumentsAndAttachments")}
                    </li>
                    <li className="list-disc">
                      {t("userSettings.allTransactionsAndRecords")}
                    </li>
                    <li className="list-disc">
                      {t("userSettings.allPreferencesAndSettings")}
                    </li>
                  </ul>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t("userSettings.deleteAccountConfirmMessage", {
                      username,
                    })}
                  </p>
                  <Input
                    value={confirmUsername}
                    onChange={(e) => setConfirmUsername(e.target.value)}
                    placeholder={t(
                      "userSettings.deleteAccountConfirmPlaceholder",
                    )}
                    disabled={isDeleting}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmUsername !== username}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      {t("page.dashboard.deleting")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("userSettings.yesDeleteMyAccount")}
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
