import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// GA4 used to record the full page URL, and the password-reset and one-time
// sign-in links carry live tokens in their query strings (w0/053). The
// bootstrap and the page-view tracker now hand GA4 origins and route patterns
// only, so no token reaches the dataLayer the tag reads.

vi.mock("@/config/config", () => ({
  config: { gaMeasurementId: "G-TEST", gaDebugMode: false },
}));

import { GoogleAnalytics } from "../google-analytics";
import { trackPageView, trackRouteView } from "../track";

const SECRET = "reset-token-3f9a";

function bootGtag() {
  const markup = renderToStaticMarkup(<GoogleAnalytics />);
  const script = /<script>([\s\S]*?)<\/script>/u.exec(markup)?.[1] ?? "";
  // Indirect eval runs the bootstrap in global scope, as the browser does.
  (0, eval)(script.replace(/&quot;/gu, '"'));
}

const dataLayerText = () => JSON.stringify(window.dataLayer);

beforeEach(() => {
  window.dataLayer = [];
  window.history.pushState({}, "", `/auth/reset-password/?token=${SECRET}`);
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: `${window.location.origin}/auth/callback?oneTimeToken=${SECRET}`,
  });
});

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("what GA4 is told about the page", () => {
  it("turns off the automatic page view and starts from the bare origin", () => {
    bootGtag();

    const config = window.dataLayer.find(
      (entry) => (entry as IArguments)[0] === "config",
    ) as IArguments;
    expect(config[2]).toMatchObject({
      send_page_view: false,
      page_location: `${window.location.origin}/`,
      page_referrer: `${window.location.origin}/`,
      page_title: "Beancount.io",
    });
  });

  it("keeps a ledger name in the tab title out of every page title it reports", () => {
    document.title = "Files - qa-private-ledger";
    bootGtag();

    trackPageView({
      route_pattern: "/ledger/:ledgerOwner/:ledgerName/files/tree/:branch/*",
    });

    expect(dataLayerText()).not.toContain("qa-private-ledger");
    // gtag reports `set` values as later events' page title (`dt`), so the
    // pattern must replace document.title there, not just on the page_view.
    const entries = window.dataLayer as IArguments[];
    expect(entries).toContainEqual(
      expect.objectContaining({
        0: "set",
        1: expect.objectContaining({
          page_title: "/ledger/:ledgerOwner/:ledgerName/files/tree/:branch/*",
        }),
      }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({
        0: "event",
        1: "page_view",
        2: expect.objectContaining({
          page_title: "/ledger/:ledgerOwner/:ledgerName/files/tree/:branch/*",
        }),
      }),
    );
  });

  it("never carries a token from an auth route's URL or referrer", () => {
    bootGtag();

    trackPageView({ route_pattern: "/auth/reset-password/" });
    trackRouteView({ route_pattern: "/auth/reset-password/" });

    const text = dataLayerText();
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain("token=");
  });

  it("reports the route pattern as the location of the page view and what follows", () => {
    bootGtag();

    trackPageView({ route_pattern: "/auth/reset-password/" });

    const entries = window.dataLayer as IArguments[];
    expect(entries).toContainEqual(
      expect.objectContaining({
        0: "set",
        1: expect.objectContaining({
          page_location: `${window.location.origin}/auth/reset-password/`,
        }),
      }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({
        0: "event",
        1: "page_view",
        2: expect.objectContaining({ page_path: "/auth/reset-password/" }),
      }),
    );
  });
});
