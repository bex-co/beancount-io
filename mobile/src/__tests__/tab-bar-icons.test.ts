import fs from "fs";
import path from "path";
// Relative import: jest-lite has no @/ alias for value modules.
import { tabIcons, tabIconName } from "../components/tab-bar-icon/tab-icons";

const layoutPath = path.join(
  __dirname,
  "..",
  "..",
  "app",
  "(app)",
  "(tabs)",
  "_layout.tsx",
);
const layout = fs.readFileSync(layoutPath, "utf8");

const routes = Object.keys(tabIcons) as (keyof typeof tabIcons)[];

describe("tab bar icons (w1/m23/t004)", () => {
  describe("focus is legible without comparing colors", () => {
    // Before this the bar rendered the filled glyph in both states and signalled
    // the active tab with hue alone — unusable for anyone who cannot separate
    // two greens, and hard for everyone else at a glance.

    it("gives every tab a different glyph when focused than when not", () => {
      const same = routes.filter(
        (route) => tabIcons[route].active === tabIcons[route].inactive,
      );
      expect(same.join(", ")).toBe("");
    });

    it("uses the outline variant for the inactive state", () => {
      const wrong = routes.filter(
        (route) => !tabIcons[route].inactive.endsWith("-outline"),
      );
      expect(wrong.join(", ")).toBe("");
    });

    it("uses the filled variant for the active state", () => {
      const wrong = routes.filter((route) =>
        tabIcons[route].active.endsWith("-outline"),
      );
      expect(wrong.join(", ")).toBe("");
    });

    it("pairs each outline with the filled glyph of the same family", () => {
      const mismatched = routes.filter(
        (route) =>
          tabIcons[route].inactive !== `${tabIcons[route].active}-outline`,
      );
      expect(mismatched.join(", ")).toBe("");
    });
  });

  describe("tabIconName picks by focus, not by tab", () => {
    it("returns the outline glyph for every unfocused tab", () => {
      const wrong = routes.filter(
        (route) => tabIconName(route, false) !== tabIcons[route].inactive,
      );
      expect(wrong.join(", ")).toBe("");
    });

    it("returns the filled glyph for every focused tab", () => {
      const wrong = routes.filter(
        (route) => tabIconName(route, true) !== tabIcons[route].active,
      );
      expect(wrong.join(", ")).toBe("");
    });

    it("never returns the filled variant for an unfocused tab", () => {
      // The specific regression: one tab falling back to `active` because its
      // pair was copied from a neighbour and never edited.
      const filled = new Set(routes.map((route) => tabIcons[route].active));
      const leaked = routes.filter((route) =>
        filled.has(tabIconName(route, false)),
      );
      expect(leaked.join(", ")).toBe("");
    });
  });

  describe("tabs are distinguishable from each other", () => {
    it("gives no two tabs the same glyph pair", () => {
      const seen = new Set(routes.map((route) => tabIcons[route].active));
      expect(seen.size).toBe(routes.length);
    });
  });

  describe("the map covers exactly the tabs the layout registers", () => {
    // A tab added to the layout without an entry here would crash on the
    // `tabIcons[route]` lookup the first time the bar rendered.
    const registered = (layout.match(/<Tabs\.Screen\s+name="([^"]+)"/g) || [])
      .map((match) => (match.match(/name="([^"]+)"/) || [])[1])
      .filter(Boolean) as string[];

    it("registers a screen for every icon pair", () => {
      const missing = routes.filter((route) => !registered.includes(route));
      expect(missing.join(", ")).toBe("");
    });

    it("declares an icon pair for every registered screen", () => {
      const missing = registered.filter(
        (route) => !(route in tabIcons),
      ) as string[];
      expect(missing.join(", ")).toBe("");
    });
  });

  describe("the layout renders the shared icon rather than a raw glyph", () => {
    it("routes every tabBarIcon through TabBarIcon", () => {
      const icons = (layout.match(/tabBarIcon:/g) || []).length;
      const shared = (layout.match(/<TabBarIcon\b/g) || []).length;
      expect(shared).toBe(icons);
    });

    it("keeps no hard-coded Ionicons in the tab bar", () => {
      expect(/<Ionicons\b/.test(layout)).toBe(false);
    });
  });
});
