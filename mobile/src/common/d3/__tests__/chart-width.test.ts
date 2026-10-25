import fs from "fs";
import path from "path";

/**
 * w21/1004: charts and the referral screen were sized from a screen width read
 * once at app start, so on iPad they kept the old width after rotation or a
 * Split View resize. The lite runner has no component-render harness, so these
 * are source checks in the `bar-chart-d3.test.ts` style: each chart measures
 * its own container through `onLayout`, sizes its SVG from the measured width,
 * and nothing under `src/` names the deleted launch-time exports anymore.
 */

const d3Dir = path.join(__dirname, "..");
const srcRoot = path.join(__dirname, "..", "..", "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(srcRoot, relativePath), "utf8");
}

/** Block comments and full-line comments: prose may name the deleted exports. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function collectSources(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Test bodies name the deleted exports in their own assertions.
      if (entry.name === "__tests__") continue;
      collectSources(full, out);
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

describe("the shared measured-width hook", () => {
  const source = readSource("common/d3/use-chart-width.ts");

  it("measures the container and falls back to the live window width", () => {
    expect(source.includes("nativeEvent.layout.width")).toBe(true);
    expect(source.includes("useWindowDimensions().width")).toBe(true);
  });
});

describe("each chart sizes its SVG from its measured container", () => {
  it("spending bars follow the container", () => {
    const source = readSource("common/d3/bar-chart-d3.tsx");
    expect(source.includes("useChartWidth(contentPadding * 2)")).toBe(true);
    expect(source.includes("onLayout={onLayout}")).toBe(true);
    expect(source.includes("<Svg width={chartWidth}")).toBe(true);
  });

  it("the balance line follows the container", () => {
    const source = readSource("common/d3/interactive-line-chart.tsx");
    expect(source.includes("useChartWidth(contentPadding * 2)")).toBe(true);
    expect(source.includes("onLayout={onLayout}")).toBe(true);
    expect(source.includes("<Svg width={chartWidth}")).toBe(true);
  });

  it("the income/expense columns follow the container", () => {
    const source = readSource("common/d3/income-expense-bar-chart.tsx");
    expect(source.includes("useChartWidth(")).toBe(true);
    expect(source.includes("<View onLayout={onLayout}>")).toBe(true);
    expect(source.includes("availableWidth = containerWidth - axisWidth")).toBe(
      true,
    );
  });

  it("the budget columns follow the container", () => {
    const source = readSource("common/d3/budget-bar-chart-d3.tsx");
    expect(source.includes("useChartWidth(")).toBe(true);
    expect(source.includes("onLayout={onLayout}")).toBe(true);
    expect(source.includes("budgetColumnWidth(\n    containerWidth,")).toBe(
      true,
    );
  });

  it("the Sankey opens on the live window width and re-measures", () => {
    const source = readSource(
      "screens/reports-screen/components/cash-flow-sankey.tsx",
    );
    expect(source.includes("useWindowDimensions().width")).toBe(true);
    expect(source.includes("onLayout={onLayout}")).toBe(true);
    expect(source.includes("<Svg width={width}")).toBe(true);
  });

  it("the referral screen stretches instead of computing a width", () => {
    const source = readSource("screens/referral-screen/referral-screen.tsx");
    expect(source.includes('alignSelf: "stretch"')).toBe(true);
  });
});

describe("no source file uses the launch-time screen size", () => {
  it("nothing under src/ names ScreenWidth or ScreenHeight", () => {
    const files: string[] = [];
    collectSources(srcRoot, files);
    expect(files.length > 0).toBe(true);
    const offenders = files.filter((file) =>
      /\bScreen(Width|Height)\b/.test(
        stripComments(fs.readFileSync(file, "utf8")),
      ),
    );
    expect(offenders.map((file) => path.relative(srcRoot, file))).toEqual([]);
  });

  it("the sweep covers the touched chart and screen files", () => {
    const files: string[] = [];
    collectSources(srcRoot, files);
    const relative = files.map((file) => path.relative(srcRoot, file));
    for (const touched of [
      "common/d3/use-chart-width.ts",
      "common/d3/bar-chart-d3.tsx",
      "common/d3/interactive-line-chart.tsx",
      "common/d3/income-expense-bar-chart.tsx",
      "common/d3/budget-bar-chart-d3.tsx",
      "common/screen-util.ts",
      "screens/reports-screen/components/cash-flow-sankey.tsx",
      "screens/referral-screen/referral-screen.tsx",
    ]) {
      expect(relative.includes(touched)).toBe(true);
    }
    expect(d3Dir.startsWith(srcRoot)).toBe(true);
  });
});
