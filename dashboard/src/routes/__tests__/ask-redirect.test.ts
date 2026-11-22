import { describe, expect, it } from "vitest";
import { isRedirect } from "@tanstack/react-router";
import { Route } from "../ledger.$ledgerOwner.$ledgerName.ask";

type BeforeLoad = (options: {
  params: { ledgerOwner: string; ledgerName: string };
  search: { q?: string };
}) => unknown;

const beforeLoad = Route.options.beforeLoad as unknown as BeforeLoad;
const params = { ledgerOwner: "alice", ledgerName: "book" };

/** Where `/ask` sends a visitor whose URL carried `search`. */
function destination(search: Record<string, unknown>) {
  const validated = (
    Route.options.validateSearch as { parse: (v: unknown) => { q?: string } }
  ).parse(search);
  try {
    beforeLoad({ params, search: validated });
  } catch (thrown) {
    if (isRedirect(thrown)) return thrown.options;
    throw thrown;
  }
  throw new Error("/ask rendered instead of redirecting");
}

describe("/ask lands on /agent", () => {
  it("keeps the deep-linked question", () => {
    expect(destination({ q: "What did I spend on rent?" })).toMatchObject({
      to: "/ledger/$ledgerOwner/$ledgerName/agent",
      params,
      search: { q: "What did I spend on rent?" },
      replace: true,
    });
  });

  it.each(["agent", "sandbox"])("redirects ?mode=%s as well", (mode) => {
    expect(destination({ mode })).toMatchObject({
      to: "/ledger/$ledgerOwner/$ledgerName/agent",
      params,
      search: {},
    });
  });

  it("drops a blank question", () => {
    expect(destination({ q: "" }).search).toEqual({});
  });
});
