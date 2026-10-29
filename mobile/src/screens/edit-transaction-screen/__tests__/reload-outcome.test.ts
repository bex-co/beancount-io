import { reloadOutcome } from "../reload-outcome";

describe("reloadOutcome (w21/693)", () => {
  it("adopts the slice the editor loaded", () => {
    expect(reloadOutcome("shaA", "shaA")).toBe("adopt");
  });

  it("refuses another slice under the ID, so a twin is never overwritten", () => {
    expect(reloadOutcome("shaA", "shaB")).toBe("changed-or-removed");
  });

  it("adopts when nothing was loaded yet", () => {
    expect(reloadOutcome(undefined, "shaB")).toBe("adopt");
  });
});
