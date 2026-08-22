import {
  pktLine,
  buildRejectionReport,
} from "@/features/gitea/api/git-proxy-handler";

/**
 * A pkt-line's four hex bytes count BYTES. Every reason string until w1/m17 was
 * ASCII, where a character count happens to agree — the directive-limit refusal
 * is prose, and it did not.
 */
describe("pkt-line encoding with non-ASCII reasons", () => {
  it("counts bytes, not characters", () => {
    const line = "over the limit — delete entries\n";
    const encoded = pktLine(line);
    const declared = parseInt(encoded.slice(0, 4), 16);
    expect(declared).toBe(Buffer.byteLength(encoded, "utf8"));
    // The em dash is three bytes, so a character count would be two short.
    expect(declared).not.toBe(encoded.length);
  });

  it("keeps the character itself instead of replacing it", () => {
    const report = buildRejectionReport(
      ["refs/heads/main"],
      ["side-band-64k"],
      "over the 1000-directive limit — delete entries",
      "Deleting entries still works — that path can tell what the ledger becomes.",
    );
    const text = report.toString("utf8");
    expect(text).toContain("—");
    expect(text).not.toContain("�");
  });

  it("declares a correct length for every packet it emits", () => {
    const report = buildRejectionReport(
      ["refs/heads/main"],
      ["side-band-64k"],
      "límite — 1000",
      "línea uno\nlínea dos\n",
    );
    // Walk the stream the way git does: each packet must land exactly on the
    // next packet's header, or everything after it is garbage.
    let offset = 0;
    let packets = 0;
    while (offset < report.length) {
      const length = parseInt(
        report.subarray(offset, offset + 4).toString(),
        16,
      );
      if (length === 0) {
        offset += 4;
        continue;
      }
      expect(length).toBeGreaterThanOrEqual(4);
      offset += length;
      packets += 1;
    }
    expect(offset).toBe(report.length);
    expect(packets).toBeGreaterThan(0);
  });

  it("still frames a plain ASCII reason the way it always did", () => {
    const report = buildRejectionReport(["refs/heads/dump"], []);
    expect(report.toString()).toContain(
      "ng refs/heads/dump only refs/heads/main may be pushed",
    );
  });
});
