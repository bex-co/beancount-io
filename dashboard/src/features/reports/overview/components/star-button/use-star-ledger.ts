import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { StarLedgerDocument, GetLedgerDocument } from "@/graphql/definitions";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useTranslations } from "@/common/hooks/use-translations";

export function useStarLedger(ledgerId: string) {
  const formatError = useErrorMessage();
  const { t } = useTranslations();
  const [starLedger, { loading }] = useMutation(StarLedgerDocument, {
    onCompleted: (data) => {
      if (data.starLedger.success) {
        toast.success(t("page.overview.starButton.starSuccess"));
      } else {
        toast.error(
          data.starLedger.message || t("page.overview.starButton.starFailed"),
        );
      }
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
    refetchQueries: [{ query: GetLedgerDocument, variables: { ledgerId } }],
    awaitRefetchQueries: true,
  });

  return {
    starLedger: () => starLedger({ variables: { ledgerId } }),
    loading,
  };
}
