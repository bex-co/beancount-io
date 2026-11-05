import { hasClippedStart, wasAtEnd } from "../scroll-cue";

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

describe("wasAtEnd", () => {
  it("is true for a chart that opened on its newest end (w21/1018)", () => {
    expect(wasAtEnd(1000, 300, 700)).toBe(true);
  });

  it("tolerates a sub-pixel gap at the end", () => {
    expect(wasAtEnd(1000, 300, 699.5)).toBe(true);
  });

  it("is false for a reader who scrolled left", () => {
    expect(wasAtEnd(1000, 300, 400)).toBe(false);
  });

  it("is true for a plot that fits its viewport", () => {
    expect(wasAtEnd(200, 300, 0)).toBe(true);
  });
});
