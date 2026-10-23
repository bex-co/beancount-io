import fs from "fs";
import path from "path";
import { journalChangeTone } from "../select-change-tone";

/**
 * w21/713: after a 10-for-1 split, account detail's chart read "+90 QANVDA
 * (+900.00%)" in green and the split's row "+90 QANVDA" in green, though no
 * money moved.
 */
describe("journalChangeTone", () => {
  it("reads units that moved at no cost as flat", () => {
    expect(journalChangeTone(90, 1, 0)).toBe("flat");
    // A 3-for-1 split whose per-unit cost was rounded.
    expect(journalChangeTone(20, 1, -0.0001)).toBe("flat");
  });

  it("still reads buys and sales in units by their direction", () => {
    expect(journalChangeTone(10, 1, 1000)).toBe("up");
    expect(journalChangeTone(-10, 1, -1000)).toBe("down");
    // Units with no known cost keep their sign.
    expect(journalChangeTone(5, 1, null)).toBe("up");
  });

  it("is unchanged for money rows, Income and Expenses included", () => {
    expect(journalChangeTone(25, 1)).toBe("up");
    expect(journalChangeTone(25, -1)).toBe("down");
    expect(journalChangeTone(0, 1)).toBe("flat");
  });
});

// w21/784: a sub-cent change read "$0.00" in red.
describe("journalChangeTone at the shown scale", () => {
  it("leaves a change that rounds to nothing flat", () => {
    expect(journalChangeTone(-0.003, 1, undefined, 2)).toBe("flat");
    expect(journalChangeTone(-0.003, 1)).toBe("down");
    expect(journalChangeTone(-0.006, 1, undefined, 2)).toBe("down");
  });

  it("is given the row's scale", () => {
    const row = fs.readFileSync(
      path.join(__dirname, "..", "..", "components", "account-entry-row.tsx"),
      "utf8",
    );
    expect(
      row
        .replace(/\s+/g, "")
        .includes("units?.cost,units?units.scale:(row.moneyScale??2),"),
    ).toBe(true);
  });
});

describe("account detail's chart of units", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(
        path.join(__dirname, "..", "..", "..", "..", ...parts),
        "utf8",
      )
      .replace(/\s+/g, "");

  it("is drawn neutral, its change with no percent", () => {
    expect(
      read(
        "screens",
        "account-detail-screen",
        "account-detail-screen.tsx",
      ).includes("neutral={unitsCurrency!==undefined}"),
    ).toBe(true);
    expect(
      read("components", "balance-chart-card", "index.tsx").includes(
        "neutral={neutral}",
      ),
    ).toBe(true);
    const chart = read("common", "d3", "interactive-line-chart.tsx");
    expect(
      chart.includes(
        "constchangePct=neutral?null:changePercent(baseline,shownValue);",
      ),
    ).toBe(true);
    // A flat range is neutral too, at rest (w21/750) and scrubbed (w21/820).
    expect(
      chart.includes(
        'constlineColor=neutral||(scrubFavorable===null?restingFlat:scrubFavorable==="flat")?theme.black80:',
      ),
    ).toBe(true);
    expect(chart.includes("neutral={neutral}scrub={scrub}")).toBe(true);
  });
});
