import {
  classifyPush,
  scanHookSignal,
  HookResponseScanner,
  type DirectiveLimitVerdict,
} from "../directive-limit-gate";

const OVER: DirectiveLimitVerdict = {
  decision: "over",
  count: 1500,
  limit: 1000,
};
const UNDER: DirectiveLimitVerdict = {
  decision: "under",
  count: 999,
  limit: 1000,
};
const UNLIMITED: DirectiveLimitVerdict = { decision: "unlimited" };
const UNKNOWN: DirectiveLimitVerdict = {
  decision: "unknown",
  reason: "count: down",
};

/** Byte-for-byte from `enforce-directive-limit.sh`, which is what we parse. */
const HOOK_REFUSAL =
  "ERROR: Push rejected — free-tier directive limit exceeded.\n" +
  "This ledger is over the 1000-directive free-tier limit (limit_exceeded).\n";
const HOOK_ARCHIVE_FAILED =
  "WARNING: directive limit check skipped (git archive failed), allowing push\n";
const HOOK_UNREACHABLE =
  "WARNING: directive limit check unavailable (ledger-service unreachable), allowing push\n";
const HOOK_UNRECOGNIZED =
  "WARNING: directive limit check returned an unrecognized response, allowing push\n";
const NON_FAST_FORWARD = "unpack ok\nng refs/heads/main non-fast-forward\n";
const ACCEPTED = "unpack ok\nok refs/heads/main\n";

describe("scanHookSignal", () => {
  it("recognises the hook's refusal", () => {
    expect(scanHookSignal(Buffer.from(HOOK_REFUSAL))).toBe("refused-by-limit");
  });

  it("recognises all three of the hook's fail-open messages", () => {
    for (const m of [
      HOOK_ARCHIVE_FAILED,
      HOOK_UNREACHABLE,
      HOOK_UNRECOGNIZED,
    ]) {
      expect(scanHookSignal(Buffer.from(m))).toBe("fail-open");
    }
  });

  it("does not mistake a non-fast-forward for a limit refusal", () => {
    // Common and legitimate. Reading it as a disagreement would bury the real
    // ones in noise.
    expect(scanHookSignal(Buffer.from(NON_FAST_FORWARD))).toBe("refused-other");
  });

  it("reads an accepted push as allowed", () => {
    expect(scanHookSignal(Buffer.from(ACCEPTED))).toBe("allowed");
  });

  it("finds the marker inside sideband framing", () => {
    // Gitea wraps hook stderr in band 2 packets; the marker travels intact
    // inside one, which is why a substring search is enough.
    const framed = Buffer.concat([
      Buffer.from("0038\x02"),
      Buffer.from(HOOK_REFUSAL),
      Buffer.from("0000"),
    ]);
    expect(scanHookSignal(framed)).toBe("refused-by-limit");
  });
});

describe("HookResponseScanner", () => {
  it("sees a marker split across chunk boundaries", () => {
    const s = new HookResponseScanner();
    s.observe(Buffer.from("ERROR: Push rejected — free-tier direc"));
    s.observe(Buffer.from("tive limit exceeded.\n"));
    expect(s.signal()).toBe("refused-by-limit");
  });

  it("stops accumulating once the cap is passed", () => {
    const s = new HookResponseScanner();
    s.observe(Buffer.alloc(HookResponseScanner.MAX_BYTES, 0x20));
    s.observe(Buffer.from(HOOK_REFUSAL));
    // A hook that prints a megabyte must not turn an observation into a memory
    // problem; losing the tail of the scan is the accepted cost.
    expect(s.signal()).toBe("allowed");
  });
});

describe("classifyPush", () => {
  it("tags the two designed-in disagreements", () => {
    // Ledger was under, the push takes it over: the price of asking "is it
    // currently over" instead of "will this take it over".
    expect(classifyPush(UNDER, "refused-by-limit")).toBe("boundary-crossing");
    // Ledger is over, the push shrinks it: the escape hatch, which the hook
    // allows and the proxy does not.
    expect(classifyPush(OVER, "allowed")).toBe("over-limit-shrinking");
  });

  it("tags agreement in both directions", () => {
    expect(classifyPush(OVER, "refused-by-limit")).toBe("agree");
    expect(classifyPush(UNDER, "allowed")).toBe("agree");
    expect(classifyPush(UNLIMITED, "allowed")).toBe("agree");
  });

  it("separates each side's fail-open from the other's", () => {
    expect(classifyPush(UNKNOWN, "allowed")).toBe("proxy-fail-open");
    expect(classifyPush(OVER, "fail-open")).toBe("hook-fail-open");
    // Our own gap must not read as agreement even when the hook did decide.
    expect(classifyPush(UNKNOWN, "refused-by-limit")).toBe("proxy-fail-open");
  });

  it("keeps unrelated refusals out of the window", () => {
    expect(classifyPush(UNDER, "refused-other")).toBe("not-applicable");
    expect(classifyPush(OVER, "refused-other")).toBe("not-applicable");
  });

  it("calls a disagreement about who is exempt unclassified", () => {
    // The proxy reads the limit through the same lookup the hook does, ticket
    // included, so this pair cannot happen under the model. If it appears, the
    // model is wrong — which is the whole point of the observation window.
    expect(classifyPush(UNLIMITED, "refused-by-limit")).toBe("unclassified");
  });
});
