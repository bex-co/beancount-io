import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { RevokeApiKeyDocument } from "@/graphql/definitions";
import type { ApiKeyListItem } from "./api-key-utils";

interface ApiKeyRevokeDialogProps {
  apiKey: ApiKeyListItem;
}

export function ApiKeyRevokeDialog({ apiKey }: ApiKeyRevokeDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [revokeApiKey, { loading }] = useMutation(RevokeApiKeyDocument);

  const handleRevoke = async () => {
    try {
      await revokeApiKey({
        variables: { id: apiKey.id },
      });
      setOpen(false);
      toast.success(t("userSettings.apiKeyRevokedSuccess"));
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t("userSettings.apiKeyRevoke")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("userSettings.apiKeyRevokeTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("userSettings.apiKeyRevokeDescription", { name: apiKey.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading
              ? t("userSettings.apiKeyRevoking")
              : t("userSettings.apiKeyRevoke")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
