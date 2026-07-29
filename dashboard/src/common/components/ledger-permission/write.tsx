import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";

export const LedgerWritePermission = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { canWrite } = useLedgerPermission();
  if (!canWrite) {
    return null;
  }
  return children;
};
