import fs from "fs";
import path from "path";
import { en } from "../../../translations/en";
import { translationLocales } from "../../../translations/__tests__/locale-parity";
import {
  CHART_STEP_REST_MS,
  chartPointText,
  chartSummaryLabel,
  stepChartIndex,
  type ChartAccessibilitySeries,
} from "../chart-accessibility";

// w21/316: VoiceOver read the headline and the change row and skipped the
// curve, and a one-finger drag is a navigation gesture there, so no earlier
// month was reachable.
const dollars = (value: number, includePlus = false) =>
  `${value < 0 ? "-" : includePlus ? "+" : ""}$${Math.abs(value).toFixed(2)}`;
const translate = (key: string, params?: Record<string, unknown>) => {
  const template: string =
    (en as unknown as Record<string, string>)[key] ??
    (key === "Jan" ? "Jan" : key);
  return Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.split(`{{${name}}}`).join(String(value)),
    template,
  );
};
const series: ChartAccessibilitySeries = {
  labels: ["Jan", "Feb", "Mar"],
  periods: ["2026-01", "2026-02", "2026-03"],
  numbers: [1000, 1300, 1100],
  baseline: 900,
  format: dollars,
  translate,
};

describe("the chart's accessibility text", () => {
  it("summarises the range with its low and high", () => {
    expect(chartSummaryLabel("Net Worth", series)).toBe(
      "Net Worth, From Jan 2026, $1000.00, to Mar 2026, $1100.00. Low $1000.00, high $1300.00.",
    );
    expect(
      chartSummaryLabel(undefined, series)?.startsWith("From Jan 2026"),
    ).toBe(true);
  });

  // w21/543: VoiceOver said "+$0.00 since start" where the header shows a
  // neutral "$0.00".
  it("says a change that rounds to nothing without a plus", () => {
    const flat = { ...series, numbers: [0, 0, 0], baseline: 0 };
    expect(chartPointText(flat, 1)).toBe("Feb 2026, $0.00, $0.00 since start");
  });

  it("has no summary without a curve to describe", () => {
    expect(chartSummaryLabel("x", { ...series, numbers: [5] })).toBe(null);
    expect(chartSummaryLabel("x", { ...series, numbers: [] })).toBe(null);
  });

  it("names the selected point with its change since the start", () => {
    expect(chartPointText(series, 1)).toBe(
      "Feb 2026, $1300.00, +$400.00 (+44.44%) since start",
    );
    // No percentage when the start is zero.
    expect(chartPointText({ ...series, baseline: 0 }, 0)).toBe(
      "Jan 2026, $1000.00, +$1000.00 since start",
    );
  });
});

// w21/783: a 10-for-1 split's units chart is neutral and its change row reads
// "+90 QANVDA", but VoiceOver said "+90 QANVDA (+900.00%)".
describe("a neutral chart's accessibility text", () => {
  const units = (value: number, includePlus = false) =>
    `${value < 0 ? "-" : includePlus ? "+" : ""}${Math.abs(value)} QANVDA`;
  const split: ChartAccessibilitySeries = {
    ...series,
    labels: ["Jan", "Feb"],
    periods: ["2026-01", "2026-02"],
    numbers: [10, 100],
    baseline: 10,
    format: units,
  };

  it("says the change without a percent, as the change row does", () => {
    expect(chartPointText({ ...split, neutral: true }, 1)).toBe(
      "Feb 2026, 100 QANVDA, +90 QANVDA since start",
    );
    expect(chartPointText(split, 1)).toBe(
      "Feb 2026, 100 QANVDA, +90 QANVDA (+900.00%) since start",
    );
  });

  it("is told the chart is neutral", () => {
    const chart = fs.readFileSync(
      path.join(__dirname, "..", "interactive-line-chart.tsx"),
      "utf8",
    );
    const start = chart.indexOf("const a11ySeries = useMemo(");
    const a11y = chart.slice(start, chart.indexOf("],", start));
    expect(start === -1).toBe(false);
    expect(a11y.includes("neutral,")).toBe(true);
  });
});

describe("stepping through the months", () => {
  it("starts from the latest point and stays inside the series", () => {
    expect(stepChartIndex(null, -1, 12)).toBe(10);
    expect(stepChartIndex(null, 1, 12)).toBe(11);
    expect(stepChartIndex(0, -1, 12)).toBe(0);
    expect(stepChartIndex(11, 1, 12)).toBe(11);
    expect(stepChartIndex(5, 1, 12)).toBe(6);
    expect(stepChartIndex(5, -1, 12)).toBe(4);
  });

  it("rests after a few seconds", () => {
    expect(CHART_STEP_REST_MS >= 3000).toBe(true);
  });
});

describe("the chart plot", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "interactive-line-chart.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("is one adjustable element with a summary, a value, a hint and actions", () => {
    for (const piece of [
      "accessible={hasSeries}",
      'accessibilityRole={hasSeries?"adjustable":undefined}',
      "accessibilityLabel={plotLabel??undefined}",
      'accessibilityHint={hasSeries?t(Platform.OS==="android"?"chartAdjustHintAndroid":"chartAdjustHint",):undefined}',
      'accessibilityActions={hasSeries?[{name:"increment"},{name:"decrement"}]:undefined}',
      "onAccessibilityAction={onAccessibilityAction}",
    ]) {
      expect(source.includes(piece)).toBe(true);
    }
  });

  it("steps the same scrub index the header follows, and rests", () => {
    expect(source.includes("scrub.value=next;")).toBe(true);
    expect(source.includes("scrub.value=SCRUB_IDLE;")).toBe(true);
    expect(source.includes("setTimeout(")).toBe(true);
  });
});

describe("the chart's strings", () => {
  it("are in every shipped language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../translations/${locale}`)[locale];
      for (const key of [
        "chartSummary",
        "chartPointValue",
        "chartAdjustHint",
        "chartAdjustHintAndroid",
      ])
        expect(typeof catalog[key]).toBe("string");
      expect(catalog.chartSummary.includes("{{startValue}}")).toBe(true);
      expect(catalog.chartPointValue.includes("{{change}}")).toBe(true);
    }
  });
});

// w21/317: the end dot and the cursor read the new series' coordinates at once
// while the line morphed, floating up to 48 px off the curve for ~450 ms.
describe("the end dot and cursor during a range change", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "interactive-line-chart.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("wait for the morph to land", () => {
    expect(
      source.includes("opacity:scrub.value===SCRUB_IDLE&&morph.value>=1?1:0"),
    ).toBe(true);
    // The cursor and its guide share the rule.
    expect(
      source.split("constactive=index!==SCRUB_IDLE&&morph.value>=1;").length -
        1,
    ).toBe(2);
  });
});

// w21/439: the reset on every new `numbers` array cleared the step but left the
// cursor and the rest timer, so VoiceOver read the latest point under a header
// showing another.
describe("stepping through a re-render", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "interactive-line-chart.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("resets only for a different series, and clears the cursor and timer with it", () => {
    expect(
      source.includes(
        "if(sameSeries(previous,numbers))return;if(stepRest.current){clearTimeout(stepRest.current);stepRest.current=null;scrub.value=SCRUB_IDLE;}setStepIndex(null);",
      ),
    ).toBe(true);
    // Not on every equal-but-new array.
    expect(
      source.includes("useEffect(()=>{setStepIndex(null);},[numbers]);"),
    ).toBe(false);
  });

  it("forgets its timer once it has rested", () => {
    expect(
      source.includes(
        "stepRest.current=setTimeout(()=>{stepRest.current=null;setStepIndex(null);",
      ),
    ).toBe(true);
  });
});

// w21/441: three Home curves read the same summary, and TalkBack was told to
// swipe like VoiceOver.
describe("which curve a chart is, and how Android steps it", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("names each Home chart to a screen reader, without drawing it", () => {
    expect(
      read(
        "screens",
        "home-screen",
        "components",
        "account-charts-card.tsx",
      ).includes("a11yLabel={t(key)}footnote={footnotes[key]}"),
    ).toBe(true);
  });

  it("words Android's hint for TalkBack, not a swipe", () => {
    expect(en.chartAdjustHintAndroid.includes("Swipe")).toBe(false);
    expect(en.chartAdjustHintAndroid).toBe(
      "Open the actions menu to step through the months",
    );
  });
});
