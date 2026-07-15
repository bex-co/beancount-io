import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useGetLedgerErrorsQuery } from "@/generated-graphql/graphql";

export type LedgerError = {
  filename: string | null | undefined;
  lineno: number | null | undefined;
  message: string;
};

export const useLedgerErrors = () => {
  const ledgerId = useReactiveVar(ledgerVar);
  const { data, loading } = useGetLedgerErrorsQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });

  const errors: LedgerError[] = data?.getLedgerErrors ?? [];

  return {
    errors,
    count: errors.length,
    loading,
  };
};
