import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertOracleCurrent,
  computeSourceHash,
} from "../bql-oracle-source-hash";

const ORACLE_DIR = join(__dirname, "..");

describe("computeSourceHash", () => {
  let dir: string;
  let queries: string;
  let fixtures: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bql-oracle-hash-"));
    queries = join(dir, "queries.json");
    fixtures = join(dir, "fixtures");
    mkdirSync(fixtures);
    writeFileSync(queries, "[]\n");
    writeFileSync(join(fixtures, "a.bean"), "2025-01-01 open Assets:A\n");
    writeFileSync(join(fixtures, "b.bean"), "2025-01-01 open Assets:B\n");
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("agrees with the hash the Python generator recorded for the real corpus", () => {
    // The only check that the two implementations stay byte-compatible: a
    // drift would otherwise surface as a permanently stale oracle in CI.
    const oracle = JSON.parse(
      readFileSync(join(ORACLE_DIR, "bql-oracle.json"), "utf8"),
    ) as { sourceHash: string };
    expect(
      computeSourceHash(
        join(ORACLE_DIR, "queries.json"),
        join(ORACLE_DIR, "fixtures"),
      ),
    ).toBe(oracle.sourceHash);
  });

  it("is stable for identical inputs", () => {
    expect(computeSourceHash(queries, fixtures)).toBe(
      computeSourceHash(queries, fixtures),
    );
  });

  it("changes when a query is edited, even by whitespace", () => {
    const before = computeSourceHash(queries, fixtures);
    writeFileSync(queries, "[] \n");
    expect(computeSourceHash(queries, fixtures)).not.toBe(before);
  });

  it("changes when a fixture's contents change", () => {
    const before = computeSourceHash(queries, fixtures);
    writeFileSync(join(fixtures, "a.bean"), "2025-01-01 open Assets:Z\n");
    expect(computeSourceHash(queries, fixtures)).not.toBe(before);
  });

  it("changes when a fixture is added", () => {
    const before = computeSourceHash(queries, fixtures);
    writeFileSync(join(fixtures, "c.bean"), "");
    expect(computeSourceHash(queries, fixtures)).not.toBe(before);
  });

  it("changes when a fixture is renamed, and keeps contents tied to their names", () => {
    const before = computeSourceHash(queries, fixtures);
    rmSync(join(fixtures, "a.bean"));
    writeFileSync(join(fixtures, "z.bean"), "2025-01-01 open Assets:A\n");
    expect(computeSourceHash(queries, fixtures)).not.toBe(before);
  });

  it("does not depend on the order files were created in", () => {
    const before = computeSourceHash(queries, fixtures);
    rmSync(join(fixtures, "a.bean"));
    rmSync(join(fixtures, "b.bean"));
    writeFileSync(join(fixtures, "b.bean"), "2025-01-01 open Assets:B\n");
    writeFileSync(join(fixtures, "a.bean"), "2025-01-01 open Assets:A\n");
    expect(computeSourceHash(queries, fixtures)).toBe(before);
  });

  it("walks fixture sub-directories", () => {
    const before = computeSourceHash(queries, fixtures);
    mkdirSync(join(fixtures, "books"));
    writeFileSync(join(fixtures, "books", "2024.bean"), "");
    expect(computeSourceHash(queries, fixtures)).not.toBe(before);
  });

  describe("assertOracleCurrent", () => {
    it("passes when the recorded hash matches", () => {
      expect(() =>
        assertOracleCurrent(
          computeSourceHash(queries, fixtures),
          queries,
          fixtures,
        ),
      ).not.toThrow();
    });

    it("fails a stale oracle with the command that regenerates it", () => {
      const recorded = computeSourceHash(queries, fixtures);
      writeFileSync(queries, '[{"id":"new"}]\n');
      expect(() => assertOracleCurrent(recorded, queries, fixtures)).toThrow(
        /out of date[\s\S]*generate-bql-oracle\.py/,
      );
    });

    it("fails an oracle that recorded no hash", () => {
      expect(() =>
        assertOracleCurrent(undefined, queries, fixtures),
      ).toThrow(/out of date/);
    });
  });
});
