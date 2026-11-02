import type { UserTier } from "@/common/hooks/use-user-limits";
import {
  ENTERPRISE_CONTACT_URL,
  planLabelKey,
} from "@/common/lib/subscription/tier-config";
import {
  isStoreSource,
  type PlanBillingStatus,
} from "@/features/user-settings/hooks/use-subscription-status";
import { BillingSource } from "@/graphql/definitions";
import { useBillingDateFormat } from "./use-money-format";

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;
type StorePlan = NonNullable<PlanBillingStatus["store"]>;

/** The plan's state as its store reports it, or null with no end date. */
function useStorePlanStatus(store: StorePlan, t: Translate): string | null {
  const formatDate = useBillingDateFormat();
  if (!store.accessEndsAt) return null;
  const date = formatDate(store.accessEndsAt);
  if (!store.willRenew) return t("userSettings.planEndsOn", { date });
  if (!store.scheduledChange) return `${t("userSettings.renewsOn")} ${date}`;
  return t("userSettings.planChangesOn", {
    plan: t(planLabelKey(store.scheduledChange.tier as UserTier)),
    date,
  });
}

function StorePlanSource({ store, t }: { store: StorePlan; t: Translate }) {
  const status = useStorePlanStatus(store, t);
  const cycle = store.interval
    ? t(
        store.interval === "year"
          ? "userSettings.yearly"
          : "userSettings.monthly",
      )
    : null;
  const line = [cycle, status].filter(Boolean).join(" · ");
  const isAppStore = store.provider === BillingSource.AppStore;

  return (
    <>
      {line && <p data-testid="store-plan-status">{line}</p>}
      <p>
        {t(
          isAppStore
            ? "userSettings.billedByAppStore"
            : "userSettings.billedByGooglePlay",
        )}
      </p>
      {isAppStore ? (
        <p>{t("userSettings.appStoreManagePath")}</p>
      ) : (
        store.managementUrl && (
          <a
            href={store.managementUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("userSettings.manageOnGooglePlay")}
          </a>
        )
      )}
    </>
  );
}

/** Who bills the plan and where it is managed (ADR 001 D14). */
export function PlanBillingSource({
  tier,
  billing,
  deferredStart = false,
  t,
}: {
  tier: UserTier;
  billing: PlanBillingStatus | null;
  /** The Stripe plan starts when the store plan ends (D15). */
  deferredStart?: boolean;
  t: Translate;
}) {
  const formatDate = useBillingDateFormat();
  let content;
  if (tier === "ENTERPRISE") {
    content = (
      <a
        href={ENTERPRISE_CONTACT_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary hover:underline"
      >
        {t("userSettings.contactUs")}
      </a>
    );
  } else if (isStoreSource(billing) && billing?.store) {
    content = <StorePlanSource store={billing.store} t={t} />;
  } else if (billing?.source === BillingSource.Stripe) {
    const store = billing.store;
    content = (
      <>
        <p>{t("userSettings.billedByStripe")}</p>
        {deferredStart && store?.accessEndsAt && (
          <p data-testid="deferred-start">
            {t(
              store.provider === BillingSource.AppStore
                ? "userSettings.deferredStartAppStore"
                : "userSettings.deferredStartGooglePlay",
              { date: formatDate(store.accessEndsAt) },
            )}
          </p>
        )}
      </>
    );
  } else {
    return null;
  }

  return (
    <div
      data-testid="plan-billing-source"
      className="mt-1 space-y-1 text-xs text-muted-foreground"
    >
      {content}
    </div>
  );
}
