import { useIsLedgerOwner } from "@/common/hooks/use-is-ledger-owner";

export const LedgerOwnerPermission = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isOwner = useIsLedgerOwner();
  if (!isOwner) {
    return null;
  }
  return children;
};
