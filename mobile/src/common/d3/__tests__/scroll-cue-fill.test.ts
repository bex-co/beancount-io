import fs from "fs";
import path from "path";

// w22/044: the cue that says earlier months are scrolled off was a strip in the
// page's base colour (`theme.white`, 85% opaque) over a card filled with
// `controlFill`: a lighter box in light mode (1.1:1 against the card), a darker
// one in dark, covering the first month's label. It is now a fade painted in the
// card's own fill. Checked on the source: the chart draws inside a ScrollView
// and an SVG this runner cannot render.
const read = (file: string) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");

const block = (source: string, name: string) => {
  const start = source.indexOf(`${name}: {`);
  return source.slice(start, source.indexOf("},", start));
};

describe("the chart's scroll cue", () => {
  const chrome = read("chart-chrome.tsx");
  const chart = read("scrollable-axis-chart.tsx");

  it("has no fill of its own in the page's base colour", () => {
    const cue = block(chrome, "clipCue");
    expect(cue.length > 0).toBe(true);
    expect(cue.includes("theme.white")).toBe(false);
    expect(cue.includes("backgroundColor")).toBe(false);
  });

  it("fades in the card's own fill, to nothing on its far side", () => {
    const stops = chart.match(/<Stop[\s\S]*?\/>/g) ?? [];
    expect(stops.length).toBe(3);
    for (const stop of stops) {
      expect(stop.includes("stopColor={theme.controlFill}")).toBe(true);
    }
    // Solid over the first stretch, so the tail of a clipped label stays hidden,
    // then gone on the far side.
    expect(stops[0]?.includes('stopOpacity="1"')).toBe(true);
    expect(stops[1]?.includes('stopOpacity="1"')).toBe(true);
    expect(stops[2]?.includes('stopOpacity="0"')).toBe(true);
  });

  it("keeps the chevron and the only-when-clipped rule", () => {
    expect(chart.includes('name="chevron-back"')).toBe(true);
    expect(chart.includes("{clipped ? (")).toBe(true);
  });
});
