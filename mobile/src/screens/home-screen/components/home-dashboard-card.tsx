import { DashboardCard, type DashboardCardProps } from "@/components";
import { analytics } from "@/common/analytics";
import { HomeCardId, createHomeCardTapHandler } from "./home-card-tap";

/**
 * A Home card is either a door or it isn't.
 *
 * Pairing the handler with its identifier in the type is what makes the
 * analytics unforgettable: there is no way to render the affordance without
 * naming the card, and no way to name a card that has nowhere to go.
 */
type TapThrough =
  | { onSeeAll: () => void; card: HomeCardId }
  | { onSeeAll?: undefined; card?: undefined };

type HomeDashboardCardProps = Omit<DashboardCardProps, "onSeeAll"> & TapThrough;

/**
 * `DashboardCard` with Home's tap-through contract attached.
 *
 * The wrapper exists so the contract lands at the right altitude. Putting it in
 * `DashboardCard` itself would have given a component shared with Reports,
 * Budget and the feed a prop typed `HomeCardId` — the first non-Home screen to
 * want a "see all" would then have to lie about being a Home card, widen a
 * union named for Home, or bypass the affordance and hand-roll a lookalike.
 * (`budget-group-card.tsx` already hand-rolls one.) Home keeps its guarantee;
 * the shared card stays generic.
 */
export function HomeDashboardCard({
  onSeeAll,
  card,
  ...rest
}: HomeDashboardCardProps): JSX.Element {
  // The one place a Home card's tap-through is tracked and fired. `track` is
  // wrapped rather than passed by reference: it reads `this.mixpanel`, and an
  // unbound reference would throw only in production, where `__DEV__` no longer
  // returns early.
  const handleSeeAll = createHomeCardTapHandler(
    (event, properties) => analytics.track(event, properties),
    card,
    onSeeAll,
  );

  return <DashboardCard {...rest} onSeeAll={handleSeeAll} />;
}
