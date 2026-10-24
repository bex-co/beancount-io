import fs from "fs";
import path from "path";
import {
  forgetSavedChecksum,
  isOtherSlice,
  isSavedChecksum,
  rememberSavedChecksum,
  isShownEntryReplaced,
  nextShownChecksum,
} from "../select-shown-checksum";

// w21/672: deleting twin A moved twin B onto A's ID, so the stale screen of A
// re-read B's checksum and its Delete removed B.
describe("the checksum a detail screen keeps", () => {
  const settled = { loading: false, adoptNext: false };

  it("keeps the first settled read through a later one that differs", () => {
    const first = nextShownChecksum(undefined, "sha-A", settled);
    expect(first).toBe("sha-A");
    // The twin B's slice now answers A's ID.
    expect(nextShownChecksum(first, "sha-B", settled)).toBe("sha-A");
    expect(isShownEntryReplaced(first, "sha-B", false)).toBe(true);
  });

  it("does not keep a cached copy the network is replacing", () => {
    expect(
      nextShownChecksum(undefined, "cached", { ...settled, loading: true }),
    ).toBe(undefined);
    expect(isShownEntryReplaced("sha-A", "sha-B", true)).toBe(false);
  });

  it("takes the next read after the user's own edit", () => {
    expect(
      nextShownChecksum("sha-A", "sha-A2", { ...settled, adoptNext: true }),
    ).toBe("sha-A2");
  });

  it("reads an unchanged entry as the same", () => {
    expect(isShownEntryReplaced("sha-A", "sha-A", false)).toBe(false);
    expect(isShownEntryReplaced(undefined, "sha-A", false)).toBe(false);
  });
});

describe("the editor opened from a detail screen", () => {
  it("refuses a slice other than the one shown, never opening the twin's text", () => {
    expect(isOtherSlice("sha-A", "sha-B")).toBe(true);
    expect(isOtherSlice("sha-A", "sha-A")).toBe(false);
  });

  it("compares nothing when no checksum came with the route", () => {
    expect(isOtherSlice(undefined, "sha-B")).toBe(false);
    expect(isOtherSlice("", "sha-B")).toBe(false);
  });
});

// w21/692: Edit then Cancel wrote nothing, but a flag left on by tapping Edit
// adopted the twin's slice on the next read.
describe("adopting the slice an Edit saved", () => {
  afterEach(() => {
    forgetSavedChecksum();
  });

  it("adopts a read that is the saved slice", () => {
    rememberSavedChecksum("sha-A2");
    expect(isSavedChecksum("sha-A2")).toBe(true);
    expect(
      nextShownChecksum("sha-A", "sha-A2", {
        loading: false,
        adoptNext: isSavedChecksum("sha-A2"),
      }),
    ).toBe("sha-A2");
  });

  it("keeps the guard on after a cancelled Edit, when the twin's slice answers", () => {
    // Nothing was saved, so nothing is remembered.
    expect(isSavedChecksum("sha-B")).toBe(false);
    const pinned = nextShownChecksum("sha-A", "sha-B", {
      loading: false,
      adoptNext: isSavedChecksum("sha-B"),
    });
    expect(pinned).toBe("sha-A");
    expect(isShownEntryReplaced(pinned, "sha-B", false)).toBe(true);
  });

  it("does not take another slice for the saved one, nor an unread value", () => {
    rememberSavedChecksum("sha-A2");
    expect(isSavedChecksum("sha-B")).toBe(false);
    expect(isSavedChecksum(undefined)).toBe(false);
    forgetSavedChecksum();
    expect(isSavedChecksum("sha-A2")).toBe(false);
  });
});

// w21/906: the saved checksum was adopted in an effect, after the frame that
// compared the old one and painted "changed or removed".
describe("the frame that reads an Edit's saved checksum", () => {
  it("shows the saved slice as the shown one, so it is not read as replaced", () => {
    rememberSavedChecksum("sha-saved");
    const read = "sha-saved";
    const shown = nextShownChecksum("sha-old", read, {
      loading: false,
      adoptNext: isSavedChecksum(read),
    });
    expect(shown).toBe("sha-saved");
    expect(isShownEntryReplaced(shown, read, false)).toBe(false);
    // Compared against the old pin, as the screen did, it was.
    expect(isShownEntryReplaced("sha-old", read, false)).toBe(true);
    forgetSavedChecksum();
  });

  it("compares the checksum worked out while rendering", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "../../transaction-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        "constentryReplaced=isShownEntryReplaced(shownSha,readSha,loading);",
      ),
    ).toBe(true);
  });
});
