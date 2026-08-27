import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { UnstarLedgerDocument, GetLedgerDocument } from "@/graphql/definitions";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useTranslations } from "@/common/hooks/use-translations";

export function useUnstarLedger(ledgerId: string) {
  const formatError = useErrorMessage();
  const { t } = useTranslations();
  const [unstarLedger, { loading }] = useMutation(UnstarLedgerDocument, {
    onCompleted: (data) => {
      if (data.unstarLedger.success) {
        toast.success(t("page.overview.starButton.unstarSuccess"));
      } else {
        toast.error(
          data.unstarLedger.message ||
            t("page.overview.starButton.unstarFailed"),
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
    unstarLedger: () => unstarLedger({ variables: { ledgerId } }),
    loading,
  };
}
