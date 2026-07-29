import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Trash2 } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import {
  DeletePublicKeyDocument,
  ListPublicKeysDocument,
} from "@/graphql/definitions";
import type { PublicKey } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { toast } from "sonner";

interface KeyDeleteDialogProps {
  keyData: PublicKey;
  children?: React.ReactNode;
}

/**
 * Dialog component for confirming key deletion
 */
export function KeyDeleteDialog({ keyData, children }: KeyDeleteDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [deleteKeyMutation, { loading: deleteKeyLoading }] = useMutation(
    DeletePublicKeyDocument,
    {
      refetchQueries: [ListPublicKeysDocument],
    },
  );

  const handleDelete = async () => {
    try {
      await deleteKeyMutation({
        variables: {
          keyId: keyData.id,
        },
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to delete key:", error);
      toast.error(formatError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("common.delete")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("userSettings.deleteSshKey")}</DialogTitle>
          <DialogDescription>
            {t("userSettings.deleteSshKeyConfirmation")} "{keyData.title}"?{" "}
            {t("userSettings.cannotBeUndone")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteKeyLoading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteKeyLoading}
          >
            {deleteKeyLoading
              ? t("userSettings.deletingKey")
              : t("userSettings.deleteKey")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
