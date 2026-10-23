import fs from "fs";
import path from "path";
import {
  clearPendingAppLink,
  holdPendingAppLinkForSignIn,
  releaseHeldAppLink,
  takeHeldAppLink,
  peekPendingAppLink,
  routeIncomingAppLink,
  setPendingAppLink,
  takePendingAppLink,
} from "../pending-app-link";
import { rewriteSystemPath } from "../rewrite-system-path";

describe("pendingAppLink", () => {
  afterEach(() => {
    clearPendingAppLink();
  });

  it("stores a target and consumes it once after sign-in", () => {
    const target = {
      ledgerFullName: "open_ledger/example",
      href: "/reports" as const,
    };
    const sourceUrl =
      "https://beancount.io/ledger/open_ledger/example/balance-sheet";
    setPendingAppLink(target, sourceUrl);
    expect(peekPendingAppLink()).toEqual({ target, sourceUrl });
    expect(takePendingAppLink()).toEqual({ target, sourceUrl });
    expect(takePendingAppLink()).toBe(null);
  });
});

// w21/083: a link opened while signed in stayed stashed and replayed on the
// next sign-in, possibly as another account.
describe("a link opened while signed in", () => {
  afterEach(() => {
    clearPendingAppLink();
  });

  const url = "https://beancount.io/ledger/alice/books/journal";

  it("opens now and leaves nothing to replay", () => {
    // `+native-intent` stashes every link it resolves, session or not.
    rewriteSystemPath(url);
    const stashed = peekPendingAppLink();
    expect(stashed === null).toBe(false);
    expect(routeIncomingAppLink(stashed!.target, url, true)).toBe(true);
    expect(peekPendingAppLink()).toBe(null);
    // The next session change finds nothing to open.
    expect(takePendingAppLink()).toBe(null);
  });

  it("still waits for sign-in when signed out", () => {
    rewriteSystemPath(url);
    const target = peekPendingAppLink()!.target;
    clearPendingAppLink();
    expect(routeIncomingAppLink(target, url, false)).toBe(false);
    expect(peekPendingAppLink()).toEqual({ target, sourceUrl: url });
  });

  it("is routed by the handler and cleared on sign-out", () => {
    const read = (...parts: string[]) =>
      fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");
    expect(
      read("use-app-link-handler.ts").includes(
        "if (routeIncomingAppLink(target, candidate, !!sessionRef.current)) {",
      ),
    ).toBe(true);
    expect(
      read("..", "server-url-actions.ts").includes("  clearPendingAppLink();"),
    ).toBe(true);
  });
});

// w21/686: the session effect and the sign-in finisher both took the slot; the
// effect won, and the finisher restored the guest view over the opened link.
describe("a link held for the sign-in finisher", () => {
  afterEach(() => {
    clearPendingAppLink();
  });

  const target = {
    ledgerFullName: "alice/books",
    href: "/transactions" as const,
  };
  const sourceUrl = "https://beancount.io/ledger/alice/books/journal";

  it("leaves the session effect nothing to take, and the finisher the link", () => {
    setPendingAppLink(target, sourceUrl);
    holdPendingAppLinkForSignIn();
    // The effect that runs when the session is set.
    expect(takePendingAppLink()).toBe(null);
    // The finisher, whenever its requests return.
    expect(takeHeldAppLink()).toEqual({ target, sourceUrl });
    expect(takeHeldAppLink()).toBe(null);
  });

  it("holds nothing when no link was waiting", () => {
    holdPendingAppLinkForSignIn();
    expect(takeHeldAppLink()).toBe(null);
  });

  it("gives an unused link back when the sign-in ends without opening it", () => {
    setPendingAppLink(target, sourceUrl);
    holdPendingAppLinkForSignIn();
    releaseHeldAppLink();
    expect(peekPendingAppLink()).toEqual({ target, sourceUrl });
  });

  it("does not bring back a link the finisher took, nor over a newer one", () => {
    setPendingAppLink(target, sourceUrl);
    holdPendingAppLinkForSignIn();
    takeHeldAppLink();
    releaseHeldAppLink();
    expect(peekPendingAppLink()).toBe(null);

    setPendingAppLink(target, sourceUrl);
    holdPendingAppLinkForSignIn();
    const newer = { ...target, href: "/reports" as const };
    setPendingAppLink(newer, "https://beancount.io/ledger/alice/books/reports");
    releaseHeldAppLink();
    expect(peekPendingAppLink()?.target).toEqual(newer);
  });
});

describe("the sign-in flow's use of the held link", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("holds the link before the session is set, and gives an unused one back", () => {
    const completion = read("oauth", "authorization-completion.ts");
    expect(
      completion.indexOf("holdPendingAppLinkForSignIn();") <
        completion.indexOf("awaitpersistSession(session,isCurrent);"),
    ).toBe(true);
    expect(completion.includes("releaseHeldAppLink();")).toBe(true);
  });

  it("has the finisher read the held link before the shared slot", () => {
    expect(
      read("oauth", "oauth-sign-in-finalizer.ts").includes(
        "takeHeldAppLink()??takePendingAppLink()",
      ),
    ).toBe(true);
  });
});
