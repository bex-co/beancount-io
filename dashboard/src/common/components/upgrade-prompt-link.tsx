import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { track, type UpgradeSurface } from "@/common/analytics";
import { useHidesBilling } from "@/common/hooks/use-hides-billing";
import { useSafeReturnPath } from "@/common/hooks/use-safe-return-path";
import { useStoreUpgradeKey } from "@/common/hooks/use-store-upgrade-key";
import { useTranslations } from "@/common/hooks/use-translations";
import { billingLinkSearch } from "@/common/lib/subscription/billing-link";
import type { TierInfo } from "@/common/lib/subscription/tier-config";
import type { BillingCycle } from "@/features/user-settings/pages/general/stripe-config";

/**
 * An in-product upgrade prompt's link: opens Billing's change sheet on the
 * recommended plan with the current page as the way back, and records
 * `upgrade_prompt_clicked`. Render it only where the prompt shows, so the
 * router subscription stays off pages that never offer an upgrade. A store
 * subscriber upgrades in the app that bills them, so the prompt says so and
 * opens Billing with no sheet.
 */
export function UpgradePromptLink({
  surface,
  plan,
  billing,
  onClick,
  children,
  ...props
}: Omit<ComponentProps<"a">, "href"> & {
  surface: UpgradeSurface;
  /** Billing opens without a sheet when no plan is recommended. */
  plan: TierInfo | null;
  billing?: BillingCycle;
}) {
  const { t } = useTranslations();
  const returnTo = useSafeReturnPath();
  const hidesBilling = useHidesBilling();
  const storeUpgradeKey = useStoreUpgradeKey();
  if (hidesBilling) return null;
  const target = storeUpgradeKey ? null : plan;
  return (
    <Link
      {...props}
      to="/settings/billing"
      search={billingLinkSearch({
        from: surface,
        plan: target?.key,
        billing: target ? billing : undefined,
        returnTo,
      })}
      onClick={(event) => {
        onClick?.(event);
        track("upgrade_prompt_clicked", {
          surface,
          ...(target ? { target_tier: target.userTier } : {}),
        });
      }}
    >
      {storeUpgradeKey ? t(storeUpgradeKey) : children}
    </Link>
  );
}
