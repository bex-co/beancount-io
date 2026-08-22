import {
  evaluateDirectiveLimit,
  directiveLimitRefusal,
  directiveLimitExplanation,
  type DirectiveLimitGateDeps,
} from "../directive-limit-gate";
import { buildRejectionReport } from "@/features/gitea/api/git-proxy-handler";
import { FavaApiError } from "@/foundation/fava";

jest.mock("@/features/stripe/operations/get-user-tier", () => ({
  getUserTierLimits: jest.fn(),
}));
import { getUserTierLimits } from "@/features/stripe/operations/get-user-tier";
const tier = getUserTierLimits as jest.Mock;

function depsThatFail(err: unknown): DirectiveLimitGateDeps {
  return {
    models: {
      user: { getUserByUsername: jest.fn(async () => ({ id: "u_1" })) },
      paidCustomer: {},
    } as never,
    db: {} as never,
    stripe: {} as never,
    cacheHelper: { get: jest.fn(async () => false) } as never,
    ledgerClient: {
      request: jest.fn(async () => {
        throw err;
      }),
    } as never,
  };
}

describe("fail-open, case by case", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tier.mockResolvedValue({ maxDirectives: 1000 });
  });

  /**
   * The parse case is the one that matters most. Once the pre-receive hook is
   * gone, deleting entries through the app is an over-limit user's only way back
   * under — and the app path runs the same parse. Refusing here would leave
   * someone who committed a syntax error unable to push the fix *or* edit it
   * away, with the parse failure itself as the thing blocking both doors.
   */
  it("allows the push when the ledger cannot be parsed", async () => {
    const verdict = await evaluateDirectiveLimit(
      depsThatFail(
        new FavaApiError("failed to parse main.bean:41", 500, {
          success: false,
          error: "failed to parse main.bean:41",
          code: null,
          details: null,
        }),
      ),
      "o",
      "r",
    );
    expect(verdict.decision).toBe("unknown");
    // The status separates a ledger that will not parse from ledger-v2 being
    // down, which otherwise flatten to the same "Unknown API error" line.
    expect(verdict).toMatchObject({ reason: expect.stringContaining("(500)") });
  });

  it("allows the push when Gitea cannot be read", async () => {
    const verdict = await evaluateDirectiveLimit(
      depsThatFail(
        new FavaApiError("gitea: 502 Bad Gateway", 502, {
          success: false,
          error: "gitea: 502 Bad Gateway",
          code: null,
          details: null,
        }),
      ),
      "o",
      "r",
    );
    expect(verdict.decision).toBe("unknown");
  });

  it("allows the push when ledger-v2 refuses to answer at all", async () => {
    const verdict = await evaluateDirectiveLimit(
      depsThatFail(Object.assign(new Error("ECONNREFUSED"), { name: "Error" })),
      "o",
      "r",
    );
    expect(verdict.decision).toBe("unknown");
  });
});

describe("the refusal a client actually receives", () => {
  const report = (caps: string[]) =>
    buildRejectionReport(
      ["refs/heads/main"],
      caps,
      directiveLimitRefusal(1509, 1000),
      directiveLimitExplanation(1509, 1000),
    ).toString("utf8");

  it("names the escape hatch, not only the limit", () => {
    // A message that says only "you are over the limit" leaves a user who does
    // not want to pay with nothing to do. The way out moved to the dashboard
    // when the hook's "push something smaller" rule went away.
    expect(report(["side-band-64k"])).toContain("dashboard");
    expect(report(["side-band-64k"])).toContain("Deleting entries");
  });

  it("is nothing like the hook's wording", () => {
    // This difference is the proof in t012/t013 that the enforcement point
    // moved — the same way `only refs/heads/main may be pushed` proved it for
    // w1/m13. If the two ever converge, that proof silently stops working.
    expect(report(["side-band-64k"])).not.toContain(
      "ERROR: Push rejected — free-tier directive limit exceeded.",
    );
  });

  it("carries the numbers so it does not read as an outage", () => {
    expect(report(["side-band-64k"])).toContain("1509");
    expect(report(["side-band-64k"])).toContain("1000");
  });

  it("sends nothing unframed when the client did not ask for side-band", () => {
    // Without side-band there is no progress channel; writing the explanation
    // anyway would put raw prose into the report-status stream and corrupt it.
    const plain = report([]);
    expect(plain).toContain("ng refs/heads/main over the 1000-directive limit");
    expect(plain).not.toContain("Deleting entries");
  });
});

describe("observing the response without stalling it", () => {
  /**
   * `pipe` does not forward source errors. Before this was handled, destroying
   * the upstream response left the observed stream with neither `end` nor
   * `error` — so a receive-pack response Gitea aborted mid-stream would hang
   * Koa's response until the socket timed out, and the observation would vanish
   * with no trace. This is the shape of that bug, pinned.
   */
  it("a bare pipe swallows a source error — which is why the handler forwards it", async () => {
    const { PassThrough, Readable } = await import("node:stream");
    const src = new Readable({ read() {} });
    // Observed on the source only so Node does not report it unhandled; the
    // assertion is about what reaches `observed`, which is nothing.
    src.on("error", () => {});
    const observed = src.pipe(new PassThrough());
    const seen: string[] = [];
    observed.on("data", () => {});
    observed.on("end", () => seen.push("end"));
    observed.on("error", () => seen.push("error"));

    src.push(Buffer.from("unpack ok\n"));
    src.destroy(new Error("gitea aborted mid-response"));
    await new Promise((r) => setTimeout(r, 20));

    expect(seen).toEqual([]);
  });

  it("forwarding the error ends the observed stream instead", async () => {
    const { PassThrough, Readable } = await import("node:stream");
    const src = new Readable({ read() {} });
    const observed = new PassThrough();
    src.on("error", (err) => observed.destroy(err));
    src.pipe(observed);
    const seen: string[] = [];
    observed.on("data", () => {});
    observed.on("end", () => seen.push("end"));
    observed.on("error", () => seen.push("error"));

    src.push(Buffer.from("unpack ok\n"));
    src.destroy(new Error("gitea aborted mid-response"));
    await new Promise((r) => setTimeout(r, 20));

    expect(seen).toContain("error");
  });
});
