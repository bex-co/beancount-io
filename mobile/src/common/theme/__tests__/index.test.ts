// Mock dependencies BEFORE any imports
const Module = require("module");
const originalRequire = Module.prototype.require;

let mockColorScheme: string | null | undefined = "light";

Module.prototype.require = function (this: NodeModule, id: string) {
  // Mock react-native
  if (id === "react-native") {
    return {
      Appearance: {
        getColorScheme: () => mockColorScheme,
      },
      Platform: {
        OS: "ios",
        select: (options: { ios?: unknown; default?: unknown }) =>
          "ios" in options ? options.ios : options.default,
      },
    };
  }

  // Mock @callstack/react-theme-provider
  if (id === "@callstack/react-theme-provider") {
    return {
      createTheming: (theme: unknown) => ({
        ThemeProvider: theme,
        withTheme: (component: unknown) => component,
        useTheme: () => theme,
      }),
    };
  }

  return originalRequire.apply(this, arguments);
};

import { getSystemColorScheme, themes, space, gutter } from "../index";

describe("getSystemColorScheme", () => {
  it("returns light when system color scheme is light", () => {
    mockColorScheme = "light";
    const result = getSystemColorScheme();
    expect(result).toBe("light");
  });

  it("returns dark when system color scheme is dark", () => {
    mockColorScheme = "dark";
    const result = getSystemColorScheme();
    expect(result).toBe("dark");
  });

  it("returns light when system color scheme is null", () => {
    mockColorScheme = null;
    const result = getSystemColorScheme();
    expect(result).toBe("light");
  });

  it("returns light when system color scheme is undefined", () => {
    mockColorScheme = undefined;
    const result = getSystemColorScheme();
    expect(result).toBe("light");
  });
});

describe("themes", () => {
  it("contains light theme definition", () => {
    expect(themes.light).toBeTruthy();
    expect(themes.light.name).toBe("light");
    expect(themes.light.colorTheme).toBeTruthy();
  });

  it("contains dark theme definition", () => {
    expect(themes.dark).toBeTruthy();
    expect(themes.dark.name).toBe("dark");
    expect(themes.dark.colorTheme).toBeTruthy();
  });

  it("light theme has expected color properties", () => {
    const { colorTheme } = themes.light;
    expect(colorTheme.white).toBe("#ffffff");
    expect(colorTheme.black).toBe("#0B0D0A");
    expect(colorTheme.primary).toBe("#35761E");
  });

  it("dark theme has expected color properties", () => {
    const { colorTheme } = themes.dark;
    expect(colorTheme.white).toBe("#0B0D0A");
    expect(colorTheme.black).toBe("#E8EDE4");
    expect(colorTheme.primary).toBe("#5FC535");
  });

  it("exposes an ascending 4pt-based spacing scale", () => {
    const scale = [
      space.xxs,
      space.xs,
      space.sm,
      space.md,
      space.lg,
      space.xl,
      space.xxl,
    ];
    expect(scale).toEqual([2, 4, 8, 12, 16, 24, 32]);
    // Strictly ascending, so tokens can't silently collide.
    const isAscending = scale.every(
      (value, i) => i === 0 || value > scale[i - 1],
    );
    expect(isAscending).toBe(true);
  });

  it("gutter is the canonical 16pt horizontal inset", () => {
    expect(gutter).toBe(16);
    expect(gutter).toBe(space.lg);
  });

  it("both themes have error colors", () => {
    expect(themes.light.colorTheme.error).toBe("#D9603F");
    expect(themes.dark.colorTheme.error).toBe("#D9603F");
  });

  it("both themes have success colors", () => {
    expect(themes.light.colorTheme.success).toBe("#0a8748");
    expect(themes.dark.colorTheme.success).toBe("#37c07c");
  });

  it("both themes have warning colors", () => {
    expect(themes.light.colorTheme.warning).toBe("#e08a1e");
    expect(themes.dark.colorTheme.warning).toBe("#f0b24e");
  });

  it("light theme has white background", () => {
    expect(themes.light.colorTheme.navBg).toBe("#ffffff");
    expect(themes.light.colorTheme.activeBackgroundColor).toBe("#ffffff");
  });

  it("dark theme has ink background", () => {
    expect(themes.dark.colorTheme.navBg).toBe("#0B0D0A");
    expect(themes.dark.colorTheme.activeBackgroundColor).toBe("#0B0D0A");
  });
});
