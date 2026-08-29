import fs from "fs";
import path from "path";
import { nativeTabIcons } from "../components/tab-bar-icon/tab-icons";

const mobileRoot = path.join(__dirname, "..", "..");
const layout = fs.readFileSync(
  path.join(mobileRoot, "app", "(app)", "(tabs)", "_layout.tsx"),
  "utf8",
);
const tabRoutes = Object.keys(nativeTabIcons);

describe("native iOS tab bar", () => {
  it("uses platform-native tabs on iOS and keeps JS tabs as the fallback", () => {
    expect(/Platform\.OS\s*===\s*"ios"/.test(layout)).toBe(true);
    expect(/<NativeTabNavigator\b/.test(layout)).toBe(true);
    expect(/<JavaScriptTabNavigator\b/.test(layout)).toBe(true);
  });

  it("registers the same five routes in the native navigator", () => {
    const registered = (
      layout.match(/<NativeTabs\.Trigger\s+name="([^"]+)"/g) || []
    ).map((match) => (match.match(/name="([^"]+)"/) || [])[1]);

    expect(registered.join(",")).toBe(tabRoutes.join(","));
  });

  it("leaves the native material appearance to UIKit", () => {
    const openingTag = (layout.match(/<NativeTabs\b[^>]*>/) || [])[0] || "";
    const customAppearanceProps = [
      "backgroundColor",
      "blurEffect",
      "shadowColor",
      "disableTransparentOnScrollEdge",
    ];
    const found = customAppearanceProps.filter((prop) =>
      openingTag.includes(prop),
    );

    expect(found.join(",")).toBe("");
  });

  it("lets the tab bar recede while reading long content", () => {
    expect(
      /<NativeTabs\b[^>]*minimizeBehavior="onScrollDown"/.test(layout),
    ).toBe(true);
  });

  it("uses distinct outline and filled SF Symbols for every route", () => {
    const wrong = tabRoutes.filter((route) => {
      const pair = nativeTabIcons[route as keyof typeof nativeTabIcons];
      return (
        String(pair.default) === pair.selected ||
        !pair.selected.endsWith(".fill")
      );
    });

    expect(wrong.join(",")).toBe("");
  });
});

describe("tab content reachability", () => {
  const insetOwners = [
    "src/components/dashboard-scroll-view/index.tsx",
    "src/components/account-table/account-table.tsx",
    "src/screens/transactions-screen/transactions-screen.tsx",
    "src/screens/ledger-file-browser-screen/index.tsx",
  ];

  it("opts every tab-owned scroll container into UIKit inset adjustment", () => {
    const missing = insetOwners.filter((relativePath) => {
      const source = fs.readFileSync(
        path.join(mobileRoot, relativePath),
        "utf8",
      );
      return !source.includes('contentInsetAdjustmentBehavior="automatic"');
    });

    expect(missing.join(",")).toBe("");
  });

  it("defers every native tab's real screen until its first focus", () => {
    const missing = tabRoutes.filter((route) => {
      const source = fs.readFileSync(
        path.join(mobileRoot, "app", "(app)", "(tabs)", `${route}.tsx`),
        "utf8",
      );
      return !source.includes("<LazyTabScreen>");
    });

    expect(missing.join(",")).toBe("");
  });
});
