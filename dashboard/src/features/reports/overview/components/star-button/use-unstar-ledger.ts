import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { UnstarLedgerDocument, GetLedgerDocument } from "@/graphql/definitions";
import { useErrorMessage } from "@/common/lib/errors/error-message";

export function useUnstarLedger(ledgerId: string) {
  const formatError = useErrorMessage();
  const [unstarLedger, { loading }] = useMutation(UnstarLedgerDocument, {
    onCompleted: (data) => {
      if (data.unstarLedger.success) {
        toast.success("Ledger unstarred successfully");
      } else {
        toast.error(data.unstarLedger.message || "Failed to unstar ledger");
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
