import {
  HOME_CARD_TAP_EVENT,
  createHomeCardTapHandler,
} from "../home-card-tap";

type Call = { event: string; properties: Record<string, unknown> };

function recorder() {
  const calls: Call[] = [];
  return {
    calls,
    track: (
      event: string,
      properties: Record<string, string | number | boolean>,
    ) => {
      calls.push({ event, properties });
    },
  };
}

test("a card with no destination gets no handler", () => {
  // The card renders its affordance only when a handler comes back, so this is
  // what keeps a non-door card free of a chevron and a touchable.
  const { track, calls } = recorder();
  expect(createHomeCardTapHandler(track, "spending", undefined)).toBe(
    undefined,
  );
  expect(calls.length).toBe(0);
});

test("a door reports itself and then navigates", () => {
  const { track, calls } = recorder();
  let navigated = 0;
  const handler = createHomeCardTapHandler(track, "spending", () => {
    navigated += 1;
  });
  handler?.();

  expect(calls.length).toBe(1);
  expect(calls[0].event).toBe(HOME_CARD_TAP_EVENT);
  expect(calls[0].properties).toEqual({ card: "spending" });
  expect(navigated).toBe(1);
});

test("each of the four doors carries its own identifier", () => {
  const { track, calls } = recorder();
  const ids = [
    "spending",
    "accounts",
    "recent_transactions",
    "budget",
  ] as const;
  ids.forEach((id) => createHomeCardTapHandler(track, id, () => undefined)?.());

  expect(calls.map((c) => c.properties.card)).toEqual([
    "spending",
    "accounts",
    "recent_transactions",
    "budget",
  ]);
  expect(calls.map((c) => c.event)).toEqual([
    HOME_CARD_TAP_EVENT,
    HOME_CARD_TAP_EVENT,
    HOME_CARD_TAP_EVENT,
    HOME_CARD_TAP_EVENT,
  ]);
});

test("one press is one event", () => {
  // The funnel counts presses; a handler that emitted twice per tap would
  // double every card's number without anything looking wrong on screen.
  const { track, calls } = recorder();
  const handler = createHomeCardTapHandler(track, "budget", () => undefined);
  handler?.();
  handler?.();
  handler?.();

  expect(calls.length).toBe(3);
});

test("the card's own handler still runs when there is no identifier", () => {
  // The typed props make this unreachable from a card, but the helper is the
  // thing under test: an unnamed door must still open rather than swallow the
  // press on its way to an event it cannot name.
  const { track, calls } = recorder();
  let navigated = 0;
  createHomeCardTapHandler(track, undefined, () => {
    navigated += 1;
  })?.();

  expect(calls.length).toBe(0);
  expect(navigated).toBe(1);
});
