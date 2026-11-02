import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { APP_MARKER_PARAM, isAppSession } from "../app-session";

const visit = (search: string) =>
  window.history.replaceState(null, "", `/ledger${search}`);

beforeEach(() => {
  window.sessionStorage.clear();
  visit("");
});
afterEach(() => vi.restoreAllMocks());

describe("isAppSession (ADR 001 D14)", () => {
  it("is false for an ordinary visit", () => {
    expect(isAppSession()).toBe(false);
  });

  it("holds for the rest of the tab once a page carried the marker", () => {
    visit(`?${APP_MARKER_PARAM}=1`);
    expect(isAppSession()).toBe(true);

    visit("");
    expect(isAppSession()).toBe(true);
  });

  it("does not outlive the tab", () => {
    visit(`?${APP_MARKER_PARAM}=1`);
    isAppSession();

    window.sessionStorage.clear();
    visit("");
    expect(isAppSession()).toBe(false);
  });

  it("still reads the URL where storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    visit(`?${APP_MARKER_PARAM}=1`);

    expect(isAppSession()).toBe(true);
  });
});

describe("where a sign-in continues", () => {
  it.each([
    "/pricing",
    "/pricing?billing=yearly",
    "/pricing/",
    "/settings/billing",
    "/settings/billing?plan=growth",
  ])("drops %s in a session an app started", (next) => {
    visit(`?${APP_MARKER_PARAM}=1`);

    expect(getSafeRedirectPath(next)).toBeUndefined();
  });

  it.each(["/ledger", "/pricing-guide", "/settings/general"])(
    "keeps %s in a session an app started",
    (next) => {
      visit(`?${APP_MARKER_PARAM}=1`);

      expect(getSafeRedirectPath(next)).toBe(next);
    },
  );

  it("keeps pricing for an ordinary visit", () => {
    expect(getSafeRedirectPath("/pricing?billing=yearly")).toBe(
      "/pricing?billing=yearly",
    );
  });
});
