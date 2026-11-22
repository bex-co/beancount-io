import { useParams } from "@tanstack/react-router";
import { usePlaidItems } from "../../hooks/use-plaid-accounts";
import { PlaidOnboardingState } from "./components/plaid-onboarding-state";
import { PlaidManagementState } from "./components/plaid-management-state";
import {
  PlaidLoadingState,
  PlaidErrorState,
  PlaidPage,
  PlaidAccessNotice,
} from "../../components/plaid-states";
import { isPlaidAccessError } from "../../utils/is-plaid-access-error";
import { createLedgerId } from "@/common/lib/utils/encode";

export function PlaidSettingsPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/link",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);

  return (
    <PlaidPage ledgerId={ledgerId}>
      <PlaidSettingsContent ledgerId={ledgerId} />
    </PlaidPage>
  );
}

function PlaidSettingsContent({ ledgerId }: { ledgerId: string }) {
  const { items, loading, error, refetch } = usePlaidItems(ledgerId);

  if (loading) {
    return <PlaidLoadingState />;
  }

  if (error) {
    if (isPlaidAccessError(error)) {
      return <PlaidAccessNotice ledgerId={ledgerId} />;
    }
    return <PlaidErrorState onRetry={() => refetch()} />;
  }

  if (items.length === 0) {
    return <PlaidOnboardingState ledgerId={ledgerId} />;
  }

  return <PlaidManagementState items={items} ledgerId={ledgerId} />;
}
