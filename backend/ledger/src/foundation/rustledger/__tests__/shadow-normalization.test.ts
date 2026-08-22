import { normalizeShadowDifferences } from "../shadow-normalization";

describe("normalizeShadowDifferences", () => {
  it("removes journal source coordinates but preserves user metadata", () => {
    expect(
      normalizeShadowDifferences("getJournal", {
        meta: {
          filename: "main.bean",
          lineno: 12,
          "receipt-id": "receipt-123",
          reviewed: true,
        },
      }),
    ).toEqual({
      meta: { "receipt-id": "receipt-123", reviewed: true },
    });
  });

  it("removes a journal meta object containing only source coordinates", () => {
    expect(
      normalizeShadowDifferences("getJournal", {
        meta: { filename: "main.bean", lineno: 12 },
      }),
    ).toEqual({});
  });
});
