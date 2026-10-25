interface ScreenUtilModule {
  onePx: number;
  contentPadding: number;
}

interface MockPixelRatio {
  get: () => number;
}

describe("screen-util", () => {
  let screenUtil: ScreenUtilModule;
  let mockPixelRatio: MockPixelRatio;

  beforeEach(() => {
    mockPixelRatio = {
      get: () => 2,
    };

    // Mock require for react-native
    const Module = require("module");
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function (
      this: NodeModule,
      id: string,
    ): unknown {
      if (id === "react-native") {
        return {
          PixelRatio: mockPixelRatio,
        };
      }
      return originalRequire.apply(this, [id]);
    };

    // Clear cache and reload module
    const screenUtilPath = require.resolve("../screen-util");
    delete require.cache[screenUtilPath];
    screenUtil = require("../screen-util") as ScreenUtilModule;
  });

  it("calculates one pixel value from PixelRatio", () => {
    expect(screenUtil.onePx).toBe(0.5); // 1 / 2
  });

  it("exports content padding constant", () => {
    expect(screenUtil.contentPadding).toBe(16);
  });

  // w21/1004: the launch-time screen size froze every chart sized from it
  // through iPad rotations, and the iPhone-X bar heights had no callers left.
  it("exports no launch-time screen size or bar heights", () => {
    const names = Object.keys(screenUtil).sort();
    expect(names).toEqual(["contentPadding", "onePx"]);
  });

  it("handles different pixel ratios", () => {
    mockPixelRatio.get = () => 3;

    const screenUtilPath = require.resolve("../screen-util");
    delete require.cache[screenUtilPath];
    const highDpiUtil = require("../screen-util") as ScreenUtilModule;

    expect(highDpiUtil.onePx).toBeCloseTo(0.333, 3);
  });

  it("handles very low pixel ratio", () => {
    mockPixelRatio.get = () => 1;

    const screenUtilPath = require.resolve("../screen-util");
    delete require.cache[screenUtilPath];
    const lowDpiUtil = require("../screen-util") as ScreenUtilModule;

    expect(lowDpiUtil.onePx).toBe(1);
  });
});
