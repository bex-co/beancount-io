/**
 * Pins the cache-persist wiring: key, maxSize, restore-before-render gate.
 * Source asserts avoid pulling AsyncStorage / apollo3-cache-persist into the
 * runner where they need native modules.
 */
const fs = require("fs");
const path = require("path");

describe("apollo cache persist wiring", () => {
  it("declares an explicit maxSize and write trigger", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../cache-persist.ts"),
      "utf8",
    );
    expect(src.includes("APOLLO_CACHE_MAX_SIZE = 1024 * 1024")).toBe(true);
    expect(src.includes('trigger: "write"')).toBe(true);
    expect(src.includes("CachePersistor")).toBe(true);
  });

  it("gates splash ready on restoreApolloCache", () => {
    const src = fs.readFileSync(
      path.join(
        __dirname,
        "../../providers/splash-provider/splash-provider.tsx",
      ),
      "utf8",
    );
    expect(src.includes("restoreApolloCache()")).toBe(true);
    expect(src.includes('from "@/common/apollo/cache-persist"')).toBe(true);
  });
});
