import { useParams } from "@tanstack/react-router";
import { usePlaidItems } from "../../hooks/use-plaid-accounts";
import { PlaidOnboardingState } from "./components/plaid-onboarding-state";
import { PlaidManagementState } from "./components/plaid-management-state";
import {
  PlaidLoadingState,
  PlaidErrorState,
} from "../../components/plaid-states";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { createLedgerId } from "@/common/lib/utils/encode";

export function PlaidSettingsPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/link",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { items, loading, error, refetch } = usePlaidItems(ledgerId);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <LedgerPageSEO seoKey="plaidSettings" noIndex />
        <PlaidLoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <LedgerPageSEO seoKey="plaidSettings" noIndex />
        <PlaidErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <LedgerPageSEO seoKey="plaidSettings" noIndex />
        <PlaidOnboardingState ledgerId={ledgerId} />
      </>
    );
  }

  return (
    <>
      <LedgerPageSEO seoKey="plaidSettings" noIndex />
      <PlaidManagementState items={items} ledgerId={ledgerId} />
    </>
  );
}
