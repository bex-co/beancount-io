/**
 * The tap-through contract for Home's dashboard cards.
 *
 * Every card that summarizes a deeper view is a door to it, and every door
 * reports itself the same way. The point of putting this here rather than in
 * each card is that a card cannot open a door *and* forget to say so: the
 * handler that navigates is the handler that tracks, built in one place.
 *
 * Import-free — it takes the tracker as an argument rather than reaching for
 * `analytics` — so the unit-test runner can require it and assert the emission
 * without a native module, matching `common/haptics.ts` and its test.
 */

/**
 * Which card was tapped. One closed set, so the funnel can be compared across
 * cards instead of being reassembled from four differently-named events.
 *
 * `accounts` is the account-charts card. The milestone spec called it
 * `liabilities`, after the source note, but that card's pager covers net worth,
 * assets *and* liabilities and opens on net worth — so the id would have told
 * every future funnel that people engage with liabilities specifically when
 * mostly they do not. Named for the card's one destination instead, which is
 * also how `spending` and `budget` read. Per-tab attribution already exists
 * separately on `home_chart_page`.
 */
export type HomeCardId =
  "spending" | "accounts" | "recent_transactions" | "budget";

/** Event name for a Home card tap-through. */
export const HOME_CARD_TAP_EVENT = "home_card_tap";

/** Matches `analytics.track`'s property type so a card cannot report a shape it rejects. */
type Track = (
  event: string,
  properties: Record<string, string | number | boolean>,
) => void;

/**
 * The press handler for a card's "see all" affordance, or `undefined` when the
 * card is not a door.
 *
 * Returning `undefined` rather than a no-op handler is deliberate: the card
 * renders the affordance only when it gets a handler back, so a card with no
 * destination gains no chevron and no touchable — and no event can be emitted
 * from a card that was never a door.
 *
 * The event fires before navigating, once per press, and never instead of the
 * card's own handler: legacy per-card events (`tap_see_all_transactions`,
 * `budget_panel_see_all`) keep firing from inside `onSeeAll`, so their history
 * stays continuous.
 */
export function createHomeCardTapHandler(
  track: Track,
  card: HomeCardId | undefined,
  onSeeAll: (() => void) | undefined,
): (() => void) | undefined {
  if (!onSeeAll) {
    return undefined;
  }
  return () => {
    if (card !== undefined) {
      track(HOME_CARD_TAP_EVENT, { card });
    }
    onSeeAll();
  };
}
