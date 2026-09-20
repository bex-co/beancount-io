import { describe, it, expect, afterEach } from "vitest";
import { countUpcomingEvents } from "../upcoming-events";

/**
 * Events are plain calendar dates, so the inclusive today..today+N window has
 * to be built from the viewer's own calendar days. Converting local midnight
 * through UTC shifts both bounds by a day in zones either side of UTC, which
 * counted yesterday's event in UTC+14 and hid the last eligible day. Each case
 * runs in a real zone, so a reintroduced UTC conversion fails here.
 */

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

/** Runs `body` as if the machine were in `timeZone`. */
function inTimeZone<T>(timeZone: string, body: () => T): T {
  process.env.TZ = timeZone;
  try {
    return body();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

/**
 * Counts with the clock at local midday on `localDate` in `timeZone`. Zones 25
 * hours apart never share a calendar date, so each zone gets the instant that
 * actually puts it on the day under test rather than one shared instant.
 */
function countOn(
  timeZone: string,
  localDate: [year: number, month1: number, day: number],
  events: Array<{ date: string }>,
  horizon: number,
) {
  const [year, month1, day] = localDate;
  return inTimeZone(timeZone, () =>
    countUpcomingEvents(
      events,
      horizon,
      new Date(year, month1 - 1, day, 12, 0, 0),
    ),
  );
}

// The real public example ledger: Chicago on 2016-11-16, with neighbours far
// enough away that only the boundary behaviour moves the count.
const EVENTS = [
  { date: "2016-04-19" },
  { date: "2016-11-16" },
  { date: "2016-11-29" },
];
const HORIZON = 7; // favaOptions.upcomingEvents for that ledger

const UTC = "UTC";
const EAST = "Pacific/Kiritimati"; // UTC+14
const WEST = "Pacific/Niue"; // UTC-11
const ZONES = [UTC, EAST, WEST];

describe("upcoming events window", () => {
  describe("the boundaries this defect was reported at", () => {
    // Both zones read November 17 locally at this instant, so one shared
    // instant is meaningful here — these are the reported repro conditions.
    it("does not count yesterday's event on November 17", () => {
      const instant = new Date("2016-11-17T00:00:00Z");
      for (const zone of [UTC, EAST]) {
        expect(
          inTimeZone(zone, () => countUpcomingEvents(EVENTS, HORIZON, instant)),
        ).toBe(0);
      }
    });

    it("still shows the November 16 event on November 9", () => {
      const instant = new Date("2016-11-09T00:00:00Z");
      for (const zone of [UTC, EAST]) {
        expect(
          inTimeZone(zone, () => countUpcomingEvents(EVENTS, HORIZON, instant)),
        ).toBe(1);
      }
    });
  });

  describe("the window edges, in each zone's own calendar", () => {
    it("counts an event happening today", () => {
      for (const zone of ZONES) {
        expect(countOn(zone, [2016, 11, 16], EVENTS, HORIZON)).toBe(1);
      }
    });

    it("includes the last day inside the horizon", () => {
      for (const zone of ZONES) {
        expect(countOn(zone, [2016, 11, 9], EVENTS, HORIZON)).toBe(1);
      }
    });

    it("excludes the day just past the horizon", () => {
      for (const zone of ZONES) {
        expect(countOn(zone, [2016, 11, 8], EVENTS, HORIZON)).toBe(0);
      }
    });

    it("excludes yesterday", () => {
      for (const zone of ZONES) {
        expect(countOn(zone, [2016, 11, 17], EVENTS, HORIZON)).toBe(0);
      }
    });
  });

  it("treats a zero horizon as today only", () => {
    for (const zone of ZONES) {
      expect(countOn(zone, [2016, 11, 16], EVENTS, 0)).toBe(1);
      expect(countOn(zone, [2016, 11, 15], EVENTS, 0)).toBe(0);
    }
  });

  it("reports a genuine zero when nothing is in range", () => {
    for (const zone of ZONES) {
      expect(countOn(zone, [2016, 7, 1], EVENTS, HORIZON)).toBe(0);
    }
  });

  it("crosses a month and year boundary without dropping a day", () => {
    const events = [{ date: "2016-12-31" }, { date: "2017-01-01" }];
    for (const zone of ZONES) {
      expect(countOn(zone, [2016, 12, 31], events, 1)).toBe(2);
    }
  });

  it("keeps the horizon inclusive across a DST transition", () => {
    // US DST ended 2016-11-06, between this viewer's today and today + 7.
    const events = [{ date: "2016-11-12" }, { date: "2016-11-13" }];
    expect(countOn("America/New_York", [2016, 11, 5], events, 7)).toBe(1);
  });
});
