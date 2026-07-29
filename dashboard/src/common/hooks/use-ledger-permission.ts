import { useLedger } from "@/common/hooks/use-ledger";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";

export const useLedgerPermission = () => {
  const isAuthenticated = useIsAuthenticated();
  const ledger = useLedger();
  if (!isAuthenticated) {
    return {
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
    isAdmin: isAdmin,
    canWrite: canWrite,
    canRead: canRead,
  };
};
