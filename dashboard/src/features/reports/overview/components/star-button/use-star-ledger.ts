import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { StarLedgerDocument, GetLedgerDocument } from "@/graphql/definitions";
import { useErrorMessage } from "@/common/lib/errors/error-message";

export function useStarLedger(ledgerId: string) {
  const formatError = useErrorMessage();
  const [starLedger, { loading }] = useMutation(StarLedgerDocument, {
    onCompleted: (data) => {
      if (data.starLedger.success) {
        toast.success("Ledger starred successfully");
      } else {
        toast.error(data.starLedger.message || "Failed to star ledger");
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
