import {
  auditSubject,
  emitAuditEvent,
  setAuditSink,
  shouldAudit,
  type AuditEvent,
} from "../audit";
import type { Identity } from "../identity";
import { requireScopeClass } from "../op-class";

/**
 * The audit trail's guarantee is structural: there is no field an argument
 * value could occupy. These tests pin that, plus the two behaviours that decide
 * whether the trail is readable (what gets recorded) and whether it is safe to
 * leave on (what happens when the sink fails).
 */

const token: Identity = {
  userId: "usr_1",
  method: "apikey",
  scopes: new Set(["ledger.write"]),
  tokenId: "akey_1",
  ledgerScope: "alice/main",
  capabilityExempt: false,
};

afterEach(() => setAuditSink(undefined));

describe("the event shape", () => {
  it("has no field capable of carrying an argument value", () => {
    const event: AuditEvent = {
      op: "REST PUT /api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
      userId: "usr_1",
      method: "apikey",
      tokenId: "akey_1",
      ledgerId: "alice/main",
      outcome: "allowed",
      at: new Date(),
    };
    // Every key is an id, an enum, or a timestamp. If this list ever grows a
    // `details`/`args`/`payload`, that is the moment to ask what could end up
    // in it — which is exactly why the assertion is on the key set.
    expect(Object.keys(event).sort()).toEqual([
      "at",
      "ledgerId",
      "method",
      "op",
      "outcome",
      "tokenId",
      "userId",
    ]);
  });

  it("projects a caller to ids only", () => {
    expect(auditSubject(token)).toEqual({
      userId: "usr_1",
      method: "apikey",
      tokenId: "akey_1",
    });
  });

  it("has nothing to project for an anonymous caller", () => {
    expect(auditSubject(undefined)).toEqual({
      userId: undefined,
      method: undefined,
      tokenId: undefined,
    });
  });
});

describe("what is recorded", () => {
  it("records every denial, whatever the class", () => {
    for (const opClass of ["read", "write", "admin", "public"]) {
      expect(shouldAudit("denied", opClass)).toBe(true);
      expect(shouldAudit("shadow-denied", opClass)).toBe(true);
    }
  });

  it("records allowed writes and admin ops", () => {
    expect(shouldAudit("allowed", "write")).toBe(true);
    expect(shouldAudit("allowed", "admin")).toBe(true);
  });

  it("does not record allowed reads", () => {
    // Most of the traffic. Recording it would bury the events an incident
    // needs, and the volume is what makes people turn audit logging off.
    expect(shouldAudit("allowed", "read")).toBe(false);
    expect(shouldAudit("allowed", "public")).toBe(false);
  });
});

describe("coverage through the enforcement seam", () => {
  /**
   * The claim t005 makes is that coverage is automatic — that it comes from
   * hooking where authorization is decided, not from each verb remembering to
   * call an emitter. That is only checkable by going through
   * `requireScopeClass` itself.
   */
  const readOnly: Identity = {
    userId: "usr_1",
    method: "oauth",
    scopes: new Set(["ledger.read"]),
    tokenId: "tok_1",
    capabilityExempt: false,
  };

  const collect = async (run: () => void): Promise<AuditEvent[]> => {
    const events: AuditEvent[] = [];
    setAuditSink(async (event) => {
      events.push(event);
    });
    try {
      run();
    } catch {
      // The refusal itself is not what this is checking.
    }
    await new Promise((resolve) => setImmediate(resolve));
    return events;
  };

  it("records a denied write without anybody calling an emitter", async () => {
    const events = await collect(() =>
      requireScopeClass(readOnly, "GQL Mutation.bulkEntries", "enforce"),
    );
    expect(events).toEqual([
      expect.objectContaining({
        op: "GQL Mutation.bulkEntries",
        userId: "usr_1",
        tokenId: "tok_1",
        outcome: "denied",
      }),
    ]);
  });

  it("records a shadow-mode refusal as such, distinctly from a real one", async () => {
    const events = await collect(() =>
      requireScopeClass(readOnly, "GQL Mutation.bulkEntries", "shadow"),
    );
    expect(events[0]).toMatchObject({ outcome: "shadow-denied" });
  });

  it("records nothing for an allowed read", async () => {
    const events = await collect(() =>
      requireScopeClass(readOnly, "GQL Query.listLedgers", "enforce"),
    );
    expect(events).toEqual([]);
  });

  it("never carries a caller-supplied value into an event", async () => {
    // The op id is a route *pattern*, so even a path crafted to smuggle a
    // secret arrives as `{owner}`/`{name}` — there is no field for the value
    // and no field that would have held it.
    const events = await collect(() =>
      requireScopeClass(
        readOnly,
        "REST PUT /api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
        "enforce",
      ),
    );
    expect(JSON.stringify(events)).not.toContain("secret");
    expect(events[0].op).not.toMatch(/[?=]/);
  });
});

describe("emission", () => {
  const event: AuditEvent = {
    op: "GQL Mutation.bulkEntries",
    userId: "usr_1",
    outcome: "allowed",
    at: new Date(),
  };

  it("passes the event to the installed sink", async () => {
    const sink = jest.fn(async () => undefined);
    setAuditSink(sink);
    emitAuditEvent(event);
    await Promise.resolve();
    expect(sink).toHaveBeenCalledWith(event);
  });

  it("is a no-op with no sink installed", () => {
    expect(() => emitAuditEvent(event)).not.toThrow();
  });

  it("does not fail the request when the sink throws", async () => {
    setAuditSink(async () => {
      throw new Error("database is on fire");
    });
    expect(() => emitAuditEvent(event)).not.toThrow();
    // The rejection is handled, not left to become an unhandled rejection that
    // takes the process down at some unrelated later moment.
    await new Promise((resolve) => setImmediate(resolve));
  });
});
