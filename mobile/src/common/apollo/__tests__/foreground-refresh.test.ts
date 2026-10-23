/**
 * Returning to the app refreshes what is on screen: mounted tabs otherwise kept
 * a transaction removed elsewhere and the old net worth (w21/024).
 *
 * Relative requires: the jest-lite runner has no `@/` alias for value imports.
 */
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  gql,
} from "@apollo/client";
import { APOLLO_DEFAULT_OPTIONS } from "../default-options";
import { createForegroundRefresher } from "../foreground-refresh";
import { refreshOnForeground } from "../refresh-on-foreground";

// w21/838: a return inside the window was dropped, and nothing caught up later.
describe("createForegroundRefresher defers a return inside the window", () => {
  const harness = () => {
    let clock = 0;
    const calls: number[] = [];
    const timers: Array<{ at: number; run: () => void }> = [];
    const onChange = createForegroundRefresher({
      refresh: () => calls.push(clock),
      now: () => clock,
      minIntervalMs: 30_000,
      schedule: (run, delayMs) => timers.push({ at: clock + delayMs, run }),
    });
    const advance = (ms: number) => {
      const target = clock + ms;
      for (const timer of timers.splice(0)) {
        if (timer.at <= target) {
          clock = timer.at;
          timer.run();
        } else {
          timers.push(timer);
        }
      }
      clock = target;
    };
    return { calls, onChange, advance, timers };
  };

  it("refreshes once when the window ends, for a return at 10 s", () => {
    const { calls, onChange, advance } = harness();
    onChange("background");
    onChange("active");
    expect(calls).toEqual([0]);
    advance(10_000);
    onChange("background");
    onChange("active");
    expect(calls).toEqual([0]);
    advance(20_000);
    expect(calls).toEqual([0, 30_000]);
  });

  it("sends one deferred refresh for several returns inside the window", () => {
    const { calls, onChange, advance, timers } = harness();
    onChange("background");
    onChange("active");
    for (let i = 0; i < 3; i += 1) {
      advance(5_000);
      onChange("inactive");
      onChange("active");
    }
    expect(timers.length).toBe(1);
    advance(20_000);
    expect(calls).toEqual([0, 30_000]);
  });
});

describe("createForegroundRefresher", () => {
  const harness = (start = 0) => {
    let clock = start;
    const calls: number[] = [];
    const onChange = createForegroundRefresher({
      refresh: () => calls.push(clock),
      now: () => clock,
      minIntervalMs: 30_000,
    });
    return {
      calls,
      onChange,
      advance: (ms: number) => {
        clock += ms;
      },
    };
  };

  it("refreshes once on a return from the background", () => {
    const { calls, onChange } = harness();
    onChange("background");
    onChange("active");
    expect(calls.length).toBe(1);
  });

  it("does not refresh while staying active", () => {
    const { calls, onChange } = harness();
    onChange("active");
    onChange("active");
    expect(calls.length).toBe(0);
  });

  it("sends one refresh per window under rapid switching", () => {
    const { calls, onChange, advance } = harness();
    for (let i = 0; i < 5; i++) {
      onChange("inactive");
      onChange("active");
      advance(2_000);
    }
    expect(calls.length).toBe(1);
    advance(30_000);
    onChange("background");
    onChange("active");
    expect(calls.length).toBe(2);
  });
});

describe("foreground refresh with the app's default options", () => {
  it("brings a mounted query's rows up to date", async () => {
    let calls = 0;
    const link = new ApolloLink(
      () =>
        new Observable((observer) => {
          calls += 1;
          observer.next({
            data: {
              journal: [
                { __typename: "Row", payee: calls === 1 ? "refund" : "rent" },
              ],
            },
          });
          observer.complete();
        }),
    );
    const client = new ApolloClient({
      link,
      cache: new InMemoryCache(),
      defaultOptions: APOLLO_DEFAULT_OPTIONS,
    });
    const seen: string[] = [];
    const subscription = client
      .watchQuery({
        query: gql`
          query {
            journal {
              payee
            }
          }
        `,
      })
      .subscribe(({ data }) => {
        const rows = (data as { journal?: { payee: string }[] } | undefined)
          ?.journal;
        if (rows) seen.push(rows[0]!.payee);
      });
    await new Promise((resolve) => setTimeout(resolve, 30));

    const onChange = createForegroundRefresher({
      refresh: () => {
        void client.refetchQueries({ include: "active" });
      },
    });
    onChange("background");
    onChange("active");
    await new Promise((resolve) => setTimeout(resolve, 30));
    subscription.unsubscribe();

    expect(calls).toBe(2);
    expect(seen[seen.length - 1]).toBe("rent");
  });
});

describe("signed-in app", () => {
  it("mounts the foreground refresh for the whole session", () => {
    const fs = require("fs");
    const path = require("path");
    const layout = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(app)",
        "_layout.tsx",
      ),
      "utf8",
    );
    expect(layout.includes("useForegroundRefresh(Boolean(session));")).toBe(
      true,
    );
  });
});

// w21/225: returning to the app moved Net Worth and Recent Transactions but not
// the Home budget panel, whose actuals are one-off reads no refetch reaches.
describe("refreshOnForeground", () => {
  it("refetches what is on screen, then wakes the unwatched readers", async () => {
    const order: string[] = [];
    await refreshOnForeground(
      {
        refetchQueries: async (options) => {
          order.push(`refetch:${options.include}`);
          return [];
        },
      },
      () => order.push("revision"),
    );
    expect(order).toEqual(["refetch:active", "revision"]);
  });

  it("still wakes them when the network is down, and never rejects", async () => {
    let revision = 0;
    await refreshOnForeground(
      {
        refetchQueries: async () => {
          throw new Error("offline");
        },
      },
      () => {
        revision += 1;
      },
    );
    expect(revision).toBe(1);
  });

  it("bumps the signal once per throttled return to the app", async () => {
    let revision = 0;
    let clock = 0;
    const pending: Promise<void>[] = [];
    const onChange = createForegroundRefresher({
      refresh: () => {
        pending.push(
          refreshOnForeground({ refetchQueries: async () => [] }, () => {
            revision += 1;
          }),
        );
      },
      now: () => clock,
      minIntervalMs: 30_000,
    });
    onChange("background");
    onChange("active");
    clock += 10_000;
    onChange("background");
    onChange("active"); // inside the 30 s throttle
    clock += 31_000;
    onChange("background");
    onChange("active");
    await Promise.all(pending);
    expect(revision).toBe(2);
  });
});

describe("what wakes on a return to the app", () => {
  const read = (...parts: string[]) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("fs") as typeof import("fs"))
      .readFileSync(
        (require("path") as typeof import("path")).join(
          __dirname,
          "..",
          "..",
          ...parts,
        ),
        "utf8",
      )
      .replace(/\s+/g, "");

  it("bumps the ledger revision the budget panel listens to", () => {
    const hook = read("hooks", "use-foreground-refresh.ts");
    expect(hook.includes("refreshOnForeground(client,")).toBe(true);
    expect(hook.includes("ledgerRevisionVar(ledgerRevisionVar()+1)")).toBe(
      true,
    );
  });

  it("revalidates the drawer's ledger list from inside its provider", () => {
    const provider = read("ledger-directory", "ledger-directory-provider.tsx");
    expect(provider.includes("createForegroundRefresher({")).toBe(true);
    expect(provider.includes("directory.revalidate()")).toBe(true);
    expect(
      provider.includes('AppState.addEventListener("change",onChange)'),
    ).toBe(true);
  });
});
