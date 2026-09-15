import { formatCommitAuthorLine } from "../formatting";

// Midday UTC, so the calendar day is the same in every time zone the runner uses.
const SEPT_13 = "2026-09-13T12:00:00Z";

describe("formatCommitAuthorLine", () => {
  it("adds the day a commit was made to its author", () => {
    expect(formatCommitAuthorLine("Dora Noda", SEPT_13, "en")).toBe(
      "Dora Noda · Sep 13, 2026",
    );
  });

  it("shows the author alone when the date is missing or unparseable", () => {
    for (const date of [undefined, null, "", "not a date"]) {
      expect(formatCommitAuthorLine("Tian Pan", date, "en")).toBe("Tian Pan");
    }
  });

  it("tells apart two commits by the same author with the same message", () => {
    const earlier = formatCommitAuthorLine(
      "Tian Pan",
      "2026-09-10T12:00:00Z",
      "en",
    );
    const later = formatCommitAuthorLine(
      "Tian Pan",
      "2026-09-12T12:00:00Z",
      "en",
    );
    expect(earlier === later).toBe(false);
  });

  it("formats the date in the app language", () => {
    const english = formatCommitAuthorLine("Dora Noda", SEPT_13, "en");
    const german = formatCommitAuthorLine("Dora Noda", SEPT_13, "de");
    expect(german === english).toBe(false);
    expect(german.startsWith("Dora Noda · ")).toBe(true);
    expect(german.includes("2026")).toBe(true);
  });
});
