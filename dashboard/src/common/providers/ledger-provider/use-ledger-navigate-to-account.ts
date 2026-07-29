import { useCallback } from "react";
import { useLedger } from "./use-ledger";
import { useNavigate } from "@tanstack/react-router";

export const useLedgerNavigateToAccount = () => {
  const { ledgerOwner, ledgerName } = useLedger();
  const navigate = useNavigate();
  const navigateToAccount = useCallback(
    (account: string) => {
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
        params: {
          ledgerOwner: ledgerOwner,
          ledgerName: ledgerName,
          accountName: account,
        },
      });
    },
    [ledgerOwner, ledgerName, navigate],
  );
  return navigateToAccount;
};
