import { hasClippedStart } from "../scroll-cue";

describe("hasClippedStart", () => {
  it("cues a plot wider than its viewport that opened on the latest columns", () => {
    expect(hasClippedStart(600, 300, 300)).toBe(true);
  });

  it("shows nothing once scrolled back to the start", () => {
    expect(hasClippedStart(600, 300, 0)).toBe(false);
  });

  it("shows nothing when the whole range fits", () => {
    expect(hasClippedStart(280, 300, 0)).toBe(false);
    expect(hasClippedStart(300, 300, 0)).toBe(false);
  });

  it("shows nothing before the viewport is measured", () => {
    expect(hasClippedStart(600, 0, 300)).toBe(false);
  });
});
