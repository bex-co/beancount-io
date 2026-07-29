import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";

export const LedgerAdminPermission = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAdmin } = useLedgerPermission();
  if (!isAdmin) {
    return null;
  }
  return children;
};
