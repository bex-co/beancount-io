/**
 * The layout-direction module decides three things that are invisible when they
 * regress and expensive when they do.
 *
 * 1. **Whether the app restarts at launch.** `applyLayoutDirection` reports
 *    whether it moved a native flag, and the splash provider restarts when it
 *    says yes. Answer "yes" on a launch that needed nothing and the app relaunch
 *    -loops before it ever renders; answer "no" on a launch that needed the
 *    flip and Persian ships inside a left-to-right shell. Neither shows up in a
 *    single manual launch.
 * 2. **Which locales are right-to-left.** Asserted across the whole locale
 *    directory rather than a sample, so a fourteenth language added without a
 *    direction fails here instead of shipping backwards.
 * 3. **Which glyphs mirror.** Vertical chevrons must survive a mirroring pass
 *    untouched.
 *
 * Relative requires and `Module._resolveFilename` interception: the runner has
 * no `@/` alias for values, and `react-native` is a native module — the same
 * shape `haptics.test.ts` uses for `expo-haptics`.
 */
const Module = require("module");

const rtlModulePath = require.resolve("../rtl");
const rnMockPath = require.resolve("./fixtures/mock-react-native");

type RnMock = typeof import("./fixtures/mock-react-native");
type RtlModule = typeof import("../rtl");

let restoreResolveFilename: (() => void) | undefined;

/** Stage a launch and hand back the module reading those flags. */
function load(isRTL: boolean, swap = true): { rtl: RtlModule; mock: RnMock } {
  const mock = require(rnMockPath) as RnMock;
  mock.reset(isRTL, swap);
  delete require.cache[rtlModulePath];
  return { rtl: require("../rtl") as RtlModule, mock };
}

/**
 * Every locale the app ships, read from the translations directory rather than
 * written down here — the same derivation the integrity suite uses, and the
 * reason this file cannot be satisfied by classifying only the locales someone
 * remembered.
 */
const allLocales = (): string[] => {
  const { translationLocales } =
    require("../../translations/__tests__/locale-parity") as typeof import("../../translations/__tests__/locale-parity");
  return ["en", ...translationLocales()];
};

describe("rtl", () => {
  beforeAll(() => {
    const originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function resolve(
      request: string,
      parent: NodeModule | null | undefined,
      isMain: boolean,
      options?: { paths?: string[] },
    ) {
      if (request === "react-native") {
        return rnMockPath;
      }
      return originalResolveFilename.call(
        this,
        request,
        parent,
        isMain,
        options,
      );
    };
    restoreResolveFilename = () => {
      Module._resolveFilename = originalResolveFilename;
    };
  });

  afterAll(() => {
    restoreResolveFilename?.();
    delete require.cache[rtlModulePath];
  });

  describe("isRtlLocale", () => {
    it("classifies every locale the app ships, not a sample", () => {
      const { rtl } = load(false);
      const rtlLocales = allLocales().filter((locale) =>
        rtl.isRtlLocale(locale),
      );

      // Thirteen locales in, exactly one out. A fourteenth language added
      // without a decision in `RTL_LOCALES` lands in the left-to-right half and
      // this stays green — which is why the count is asserted too.
      expect(allLocales().length).toBe(13);
      expect(rtlLocales).toEqual(["fa"]);
    });

    it("reads a regional tag by its base language", () => {
      const { rtl } = load(false);

      expect(rtl.isRtlLocale("fa-IR")).toBe(true);
      expect(rtl.isRtlLocale("en-US")).toBe(false);
    });
  });

  describe("layoutDirectionChanges", () => {
    it("is true for exactly the pairs that cross the boundary", () => {
      const { rtl } = load(false);
      const locales = allLocales();
      const crossing: string[] = [];

      for (const from of locales) {
        for (const to of locales) {
          if (rtl.layoutDirectionChanges(from, to)) {
            crossing.push(`${from}->${to}`);
          }
        }
      }

      // 12 left-to-right locales, so 12 ways into Persian and 12 back out. Any
      // pair that does not involve `fa` must be instant — a restart prompt on
      // `de` -> `fr` is a bug the user feels immediately.
      expect(crossing.length).toBe(24);
      expect(crossing.filter((pair) => !pair.includes("fa")).length).toBe(0);
      expect(rtl.layoutDirectionChanges("de", "fr")).toBe(false);
      expect(rtl.layoutDirectionChanges("fa", "fa")).toBe(false);
    });
  });

  describe("applyLayoutDirection", () => {
    it("does nothing on the ordinary left-to-right launch", () => {
      const { rtl, mock } = load(false, false);

      expect(rtl.applyLayoutDirection("en")).toBe(false);
      expect(mock.calls).toEqual([]);
    });

    it("does nothing on a second Persian launch", () => {
      const { rtl, mock } = load(true, false);

      expect(rtl.applyLayoutDirection("fa")).toBe(false);
      expect(mock.calls).toEqual([]);
    });

    it("flips into right-to-left and asks to restart", () => {
      const { rtl, mock } = load(false, true);

      expect(rtl.applyLayoutDirection("fa")).toBe(true);
      expect(mock.calls).toEqual([
        { method: "allowRTL", value: true },
        { method: "forceRTL", value: true },
        { method: "swapLeftAndRightInRTL", value: false },
      ]);
    });

    it("flips back out of right-to-left and asks to restart", () => {
      const { rtl, mock } = load(true, false);

      expect(rtl.applyLayoutDirection("en")).toBe(true);
      expect(mock.calls).toEqual([
        { method: "allowRTL", value: false },
        { method: "forceRTL", value: false },
        { method: "swapLeftAndRightInRTL", value: false },
      ]);
    });

    it("restarts a Persian launch that still has the left/right swap on", () => {
      // The regression this guards: with React Native's swap left at its
      // default, `left: 0` silently becomes `right: 0` while `translateX` and
      // `onLayout` stay physical — which sent the time-range pills' selected
      // fill off the end of the row. The direction is already correct here, so
      // only the swap flag can force the restart.
      const { rtl, mock } = load(true, true);

      expect(rtl.applyLayoutDirection("fa")).toBe(true);
      expect(mock.calls).toEqual([
        { method: "allowRTL", value: true },
        { method: "forceRTL", value: true },
        { method: "swapLeftAndRightInRTL", value: false },
      ]);
    });

    it("does not restart a left-to-right launch over the swap flag", () => {
      // The swap only does anything under RTL, so charging the twelve
      // left-to-right locales a relaunch to clear it would be a cost with no
      // benefit — on every install, once.
      const { rtl, mock } = load(false, true);

      expect(rtl.applyLayoutDirection("de")).toBe(false);
      expect(mock.calls).toEqual([]);
    });
  });

  describe("directionalIcon", () => {
    it("mirrors the horizontal pairs under right-to-left", () => {
      const { rtl } = load(true);

      expect(rtl.directionalIcon("chevron-forward")).toBe("chevron-back");
      expect(rtl.directionalIcon("chevron-back")).toBe("chevron-forward");
      expect(rtl.directionalIcon("arrow-forward")).toBe("arrow-back");
      expect(rtl.directionalIcon("arrow-back")).toBe("arrow-forward");
    });

    it("leaves every glyph alone under left-to-right", () => {
      const { rtl } = load(false);

      expect(rtl.directionalIcon("chevron-forward")).toBe("chevron-forward");
      expect(rtl.directionalIcon("arrow-back")).toBe("arrow-back");
    });

    it("passes vertical and unknown glyphs through untouched", () => {
      // A blanket mirror would turn a collapsed section's `chevron-down` into
      // something that means the opposite, and would rewrite any icon name a
      // future screen hands it.
      const { rtl } = load(true);

      expect(rtl.directionalIcon("chevron-down")).toBe("chevron-down");
      expect(rtl.directionalIcon("chevron-up")).toBe("chevron-up");
      expect(rtl.directionalIcon("ellipsis-horizontal")).toBe(
        "ellipsis-horizontal",
      );
    });
  });

  describe("layout direction helpers", () => {
    it("signs the factor for the geometry React Native does not mirror", () => {
      expect(load(true).rtl.layoutDirectionFactor()).toBe(-1);
      expect(load(false).rtl.layoutDirectionFactor()).toBe(1);
      expect(load(true).rtl.isRtlLayout()).toBe(true);
      expect(load(false).rtl.isRtlLayout()).toBe(false);
    });

    it("keeps LEADING_TEXT_ALIGN direction-independent", () => {
      // Not a tautology: `textAlign` is already flipped by React Native under
      // right-to-left, so the one plausible "fix" to this constant — branching
      // it on `isRTL` — double-flips it and lands the text on the wrong edge.
      // Asserting it reads the same in both directions is what rules that out.
      expect(load(true).rtl.LEADING_TEXT_ALIGN).toBe(
        load(false).rtl.LEADING_TEXT_ALIGN,
      );
      expect(load(true).rtl.LEADING_TEXT_ALIGN).toBe("left");
    });
  });
});
