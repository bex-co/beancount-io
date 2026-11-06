import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MCP_TOOLS } from "../mcp-tools";

/**
 * w23/m21 — the one preview rule, kept honest.
 *
 * A write tool that takes `dry_run` either projects the write through
 * bean-check (its preview returns the diff, `newErrors` and `valid:false`
 * instead of refusing; only the commit is refused — w1/037, w23/219), or it
 * previews something that is not a bean-check projection (a bank sync, an
 * access change, a destroy summary). Each tool is registered here exactly
 * once, and a projection tool names the parity tests that prove both halves
 * of the rule on REST, GraphQL and MCP. A new write tool with a preview flag
 * fails this file until it is classified; a proof that is renamed or deleted
 * fails it too, so the rule cannot erode silently.
 */
const FEATURES = join(__dirname, "..", "..", "..");

type Proof = { file: string; test: string };
type Entry =
  | { kind: "projection"; proofs: Proof[] }
  | { kind: "summary"; reason: string };

const REST_V1 = "ledger/api/rest/v1/__tests__";
const ENTRY_PARITY: Proof[] = [
  {
    file: `${REST_V1}/structured-entry-parity.test.ts`,
    test: "previews an unbalanced batch as invalid and still refuses the commit",
  },
  {
    file: `${REST_V1}/structured-entry-parity.test.ts`,
    test: "previews breaking entries as invalid and still refuses the commit",
  },
];
const FILE_PARITY: Proof[] = [
  {
    file: "ai-agent/api/__tests__/file-write-gate-parity.test.ts",
    test: "previews the MCP create, update and delete tools as invalid on dry_run",
  },
  {
    file: "ai-agent/api/__tests__/file-write-gate-parity.test.ts",
    test: "previews a REST PUT and DELETE dryRun as invalid, committing nothing",
  },
  {
    file: "ai-agent/api/__tests__/file-write-gate-parity.test.ts",
    test: "refuses the MCP create, update and delete tools on commit",
  },
];
const SLICE_PARITY: Proof[] = [
  {
    file: `${REST_V1}/source-slice-parity.test.ts`,
    test: "previews a breaking edit as invalid without allowInvalid, changing nothing",
  },
  {
    file: `${REST_V1}/source-slice-parity.test.ts`,
    test: "still refuses the commit of a breaking edit, changing nothing",
  },
];
const SUMMARY = (reason: string): Entry => ({ kind: "summary", reason });

const WRITE_PREVIEW_RULES: Record<string, Entry> = {
  addLedgerEntries: { kind: "projection", proofs: ENTRY_PARITY },
  appendLedgerText: {
    kind: "projection",
    proofs: [
      {
        file: `${REST_V1}/directive-text-parity.test.ts`,
        test: "previews a write that would break the ledger, with its new errors, via %s",
      },
    ],
  },
  createLedgerFiles: { kind: "projection", proofs: FILE_PARITY },
  updateLedgerFiles: { kind: "projection", proofs: FILE_PARITY },
  deleteLedgerFiles: { kind: "projection", proofs: FILE_PARITY },
  updateEntrySource: { kind: "projection", proofs: SLICE_PARITY },
  deleteEntrySource: { kind: "projection", proofs: SLICE_PARITY },
  deleteEntrySources: { kind: "projection", proofs: SLICE_PARITY },
  renameLedgerFile: SUMMARY(
    "a move plus rewritten include lines; the content is not re-projected through bean-check",
  ),
  syncBankTransactions: SUMMARY("counts what a sync would stage"),
  importStagedBankTransactions: SUMMARY(
    "returns the transactions it would write",
  ),
  discardStagedBankTransactions: SUMMARY(
    "lists the staged rows it would remove",
  ),
  reconcileBankAccounts: SUMMARY("lists the account changes it would apply"),
  unlinkBankConnection: SUMMARY("summarizes what unlinking would sever"),
  updateLedger: SUMMARY(
    "the current-to-new diff, with a flip to public called out",
  ),
  deleteLedger: SUMMARY(
    "the destroy summary: identity, emptiness, size, warnings",
  ),
  setLedgerCollaborator: SUMMARY("the would-be grant, current to requested"),
  removeLedgerCollaborator: SUMMARY("the would-be revocation"),
  leaveLedger: SUMMARY("the would-be self-removal"),
};

function previewTools(): string[] {
  return (MCP_TOOLS as unknown as { name: string; inputSchema: unknown }[])
    .filter((tool) => {
      const schema = tool.inputSchema as {
        shape?: Record<string, unknown>;
        properties?: Record<string, unknown>;
      };
      const keys = Object.keys(schema?.shape ?? schema?.properties ?? {});
      return keys.some((key) => /^dry_?run$/i.test(key));
    })
    .map((tool) => tool.name)
    .sort();
}

describe("the write-preview rule matrix (w23/m21)", () => {
  it("classifies every MCP write tool that takes dry_run, and nothing else", () => {
    expect(previewTools()).toEqual(Object.keys(WRITE_PREVIEW_RULES).sort());
  });

  const projections = Object.entries(WRITE_PREVIEW_RULES).flatMap(
    ([tool, entry]) =>
      entry.kind === "projection"
        ? entry.proofs.map((proof) => [tool, proof] as const)
        : [],
  );

  it.each(projections)(
    "%s is proved by a parity test that still exists: %j",
    (_tool, proof) => {
      const path = join(FEATURES, proof.file);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toContain(proof.test);
    },
  );

  it.each(
    Object.entries(WRITE_PREVIEW_RULES).flatMap(([tool, entry]) =>
      entry.kind === "summary" ? [[tool, entry.reason] as const] : [],
    ),
  )("%s previews a summary, for a stated reason: %s", (_tool, reason) => {
    expect(reason.length).toBeGreaterThan(10);
  });
});
