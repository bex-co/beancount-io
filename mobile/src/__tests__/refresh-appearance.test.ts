import fs from "fs";
import path from "path";
// Relative imports: jest-lite has no @/ alias for value modules.
import { refreshAppearance } from "../components/dashboard-scroll-view/refresh-appearance";
import { effectiveThemeName, themes } from "../common/theme/palette";

const srcRoot = path.join(__dirname, "..");
const appRoot = path.join(__dirname, "..", "..", "app");

/** Every hand-written source file under `src/` and `app/`. */
const collectSourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === "generated-graphql" || entry.name === "__tests__") {
      continue;
    }
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      out.push(full);
    }
  }
  return out;
};

const sourceFiles = [
  ...collectSourceFiles(srcRoot),
  ...collectSourceFiles(appRoot),
];

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("the shared pull-to-refresh appearance (w1/m23/t001)", () => {
  describe("resolves entirely from the palette it is handed", () => {
    it("tints the spinner with quiet secondary text in light", () => {
      const light = refreshAppearance(themes.light.colorTheme, "light");
      expect(light.tintColor).toBe(themes.light.colorTheme.black80);
      expect(light.colors[0]).toBe(themes.light.colorTheme.black80);
      expect(light.progressBackgroundColor).toBe(themes.light.colorTheme.white);
    });

    it("tints the spinner with inverted foreground in dark", () => {
      // Bone on charcoal — bright enough that iOS refresh darkening still
      // leaves a readable gray, without borrowing brand green.
      const dark = refreshAppearance(themes.dark.colorTheme, "dark");
      expect(dark.tintColor).toBe(themes.dark.colorTheme.black);
      expect(dark.colors[0]).toBe(themes.dark.colorTheme.black);
      expect(dark.progressBackgroundColor).toBe(themes.dark.colorTheme.white);
    });

    it("stays off the brand greens", () => {
      (["light", "dark"] as const).forEach((name) => {
        const appearance = refreshAppearance(themes[name].colorTheme, name);
        expect(appearance.tintColor === themes[name].colorTheme.primary).toBe(
          false,
        );
        expect(
          appearance.tintColor === themes[name].colorTheme.primaryLight,
        ).toBe(false);
        expect(
          appearance.tintColor === themes[name].colorTheme.primaryDark,
        ).toBe(false);
      });
    });

    it("actually differs between the two themes", () => {
      // A resolver that returned one constant would pass every assertion above
      // and still be the bug this task removed.
      const light = refreshAppearance(themes.light.colorTheme, "light");
      const dark = refreshAppearance(themes.dark.colorTheme, "dark");
      expect(light.tintColor === dark.tintColor).toBe(false);
      expect(
        light.progressBackgroundColor === dark.progressBackgroundColor,
      ).toBe(false);
    });

    it("never falls back to the hard-coded black/white string literals", () => {
      (["light", "dark"] as const).forEach((name) => {
        const appearance = refreshAppearance(themes[name].colorTheme, name);
        expect(appearance.tintColor === "white").toBe(false);
        expect(appearance.tintColor === "black").toBe(false);
      });
    });

    it("gives Android the same tint it gives iOS", () => {
      // Three of the old sites set `tintColor` and none set `colors`, so the
      // Android spinner ignored the app's tint entirely.
      (["light", "dark"] as const).forEach((name) => {
        const appearance = refreshAppearance(themes[name].colorTheme, name);
        expect(appearance.colors.length).toBe(1);
        expect(appearance.colors[0]).toBe(appearance.tintColor);
      });
    });
  });

  describe('follows the effective theme when the setting is "system"', () => {
    // The failure this guards: `themeVar` holds the *setting*, so a site that
    // compares it to "dark" gives every system-theme user the light spinner on
    // a dark screen. Resolving through `effectiveThemeName` first is the fix.
    const appearanceFor = (
      setting: "light" | "dark" | "system",
      systemScheme: "light" | "dark",
    ) => {
      const name = effectiveThemeName(setting, systemScheme);
      return refreshAppearance(themes[name].colorTheme, name);
    };

    it("uses the dark appearance for a system user on a dark device", () => {
      expect(appearanceFor("system", "dark").tintColor).toBe(
        themes.dark.colorTheme.black,
      );
    });

    it("uses the light appearance for a system user on a light device", () => {
      expect(appearanceFor("system", "light").tintColor).toBe(
        themes.light.colorTheme.black80,
      );
    });

    it("lets an explicit setting override the device", () => {
      expect(appearanceFor("dark", "light").tintColor).toBe(
        themes.dark.colorTheme.black,
      );
      expect(appearanceFor("light", "dark").tintColor).toBe(
        themes.light.colorTheme.black80,
      );
    });
  });

  describe("no screen keeps its own convention", () => {
    it("renders RefreshControl only inside the shared component", () => {
      const offenders = sourceFiles
        .filter(
          (file) =>
            path.basename(path.dirname(file)) !== "dashboard-scroll-view" &&
            /<RefreshControl\b/.test(read(file)),
        )
        .map((file) => path.relative(srcRoot, file));
      expect(offenders.join(", ")).toBe("");
    });

    it("leaves no refresh tint hard-coded at a call site", () => {
      const offenders = sourceFiles
        .filter((file) => /tintColor=\{[^}]*"(white|black)"/.test(read(file)))
        .map((file) => path.relative(srcRoot, file));
      expect(offenders.join(", ")).toBe("");
    });

    it("never resolves an appearance by comparing themeVar to a theme", () => {
      // `themeVar` can hold "system"; only `useTheme().name` is a real theme.
      const offenders = sourceFiles
        .filter((file) => {
          const source = read(file);
          const assignment = source.match(
            /\bconst\s+(\w+)\s*=\s*useReactiveVar\(themeVar\)/,
          );
          if (!assignment) {
            return false;
          }

          // Match a comparison of the value returned from `themeVar`, not an
          // unrelated comparison in the same module (the provider legitimately
          // maps Appearance's `colorScheme === "dark"` to a resolved theme).
          const escapedName = assignment[1].replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          return new RegExp(`\\b${escapedName}\\s*===\\s*["']dark["']`).test(
            source,
          );
        })
        .map((file) => path.relative(srcRoot, file));
      expect(offenders.join(", ")).toBe("");
    });
  });
});
