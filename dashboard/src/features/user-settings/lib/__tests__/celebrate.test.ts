import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockConfetti } = vi.hoisted(() => ({ mockConfetti: vi.fn() }));
vi.mock("canvas-confetti", () => ({ default: mockConfetti }));

import { celebrate } from "../celebrate";

function prefersReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

beforeEach(() => {
  mockConfetti.mockClear();
  mockConfetti.mockImplementation(() => Promise.resolve());
});

describe("celebrate", () => {
  it("bursts confetti, still asking the library to honour reduced motion", async () => {
    prefersReducedMotion(false);

    await celebrate();

    expect(mockConfetti).toHaveBeenCalledTimes(1);
    expect(mockConfetti).toHaveBeenCalledWith(
      expect.objectContaining({ disableForReducedMotion: true }),
    );
  });

  it("does nothing, not even load the library, for a reader who prefers reduced motion", async () => {
    prefersReducedMotion(true);

    await celebrate();

    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it("swallows a failure: a missing celebration never breaks the page", async () => {
    prefersReducedMotion(false);
    mockConfetti.mockRejectedValue(new Error("canvas unavailable"));

    await celebrate();

    expect(mockConfetti).toHaveBeenCalledTimes(1);
  });

  it("still bursts where the browser cannot report a motion preference", async () => {
    // @ts-expect-error -- an older browser without matchMedia
    window.matchMedia = undefined;

    await celebrate();

    expect(mockConfetti).toHaveBeenCalledTimes(1);
  });
});
