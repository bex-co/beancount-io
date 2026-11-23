import { useLedger } from "@/common/hooks/use-ledger";
import { useAuthStatus } from "@/common/hooks/use-auth-status";

export const useLedgerPermission = () => {
  const authStatus = useAuthStatus();
  const ledger = useLedger();
  if (authStatus !== "signed-in") {
    return {
      authStatus,
      isAdmin: false,
      canWrite: false,
      canRead: false,
    };
  }

  const permissions = ledger.ledgerData.permissions;
  const isAdmin = permissions?.admin === true;
  const canWrite = permissions?.push === true || isAdmin;
  const canRead = permissions?.pull === true || isAdmin;

  return {
    authStatus,
    isAdmin,
    canWrite,
    canRead,
  };
};
