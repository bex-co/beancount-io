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
/**
 * How a projection tool's preview is shown to equal its commit (w23/m39): a
 * case in `preview-commit-differential.test.ts`, which runs the write twice
 * on identical ledgers and compares the verdicts, or the written reason the
 * differential cannot cover it.
 */
type Differential = { case: true } | { reason: string };
type Entry =
  | {
      kind: "projection";
      proofs: Proof[];
      differential: Differential;
      /** Where the rule below does not hold in full, and why. */
      exception?: string;
    }
  | { kind: "summary"; reason: string };

const REST_V1 = "ledger/api/rest/v1/__tests__";
const DIFFERENTIAL_FILE =
  "ai-agent/api/__tests__/preview-commit-differential.test.ts";
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

/**
 * The entry and text tools preview and commit through one ledger-service call
 * that reports the projection (`errors_before`, `errors_after`, `new_errors`),
 * so a preview is the commit minus the write; the differential harness has no
 * ledger engine to run them on. Each is proved by its parity suite instead.
 */
const DIFFERENTIAL_CASE: Differential = { case: true };

const ONE_PROJECTION_CALL: Differential = {
  reason:
    "preview and commit share one ledger-service projection call, proved by the parity suites named above; the differential harness has no ledger engine to run it on",
};

const WRITE_PREVIEW_RULES: Record<string, Entry> = {
  addLedgerEntries: {
    kind: "projection",
    proofs: ENTRY_PARITY,
    differential: ONE_PROJECTION_CALL,
  },
  appendLedgerText: {
    kind: "projection",
    proofs: [
      {
        file: `${REST_V1}/directive-text-parity.test.ts`,
        test: "previews a write that would break the ledger, with its new errors, via %s",
      },
    ],
    differential: ONE_PROJECTION_CALL,
  },
  createLedgerFiles: {
    kind: "projection",
    proofs: FILE_PARITY,
    differential: DIFFERENTIAL_CASE,
  },
  updateLedgerFiles: {
    kind: "projection",
    proofs: FILE_PARITY,
    differential: DIFFERENTIAL_CASE,
  },
  deleteLedgerFiles: {
    kind: "projection",
    proofs: FILE_PARITY,
    differential: DIFFERENTIAL_CASE,
  },
  updateEntrySource: {
    kind: "projection",
    proofs: SLICE_PARITY,
    differential: ONE_PROJECTION_CALL,
  },
  deleteEntrySource: {
    kind: "projection",
    proofs: SLICE_PARITY,
    differential: ONE_PROJECTION_CALL,
  },
  deleteEntrySources: {
    kind: "projection",
    proofs: SLICE_PARITY,
    differential: ONE_PROJECTION_CALL,
  },
  // A move projects bean-check over the files it would leave, with the moved
  // file's errors carried to its new path; it was a summary until w1/236.
  renameLedgerFile: {
    kind: "projection",
    proofs: [
      {
        file: DIFFERENTIAL_FILE,
        test: "renaming a file that carries errors adds none",
      },
      {
        file: `${REST_V1}/rename-parity.test.ts`,
        test: "reports bean-check's verdict around the write",
      },
    ],
    differential: DIFFERENTIAL_CASE,
    exception:
      "no surface refuses the commit for new errors (it reports them, as the preview does); REST, GraphQL and MCP all carry the verdict (w23/233)",
  },
  // Undoing a commit projects bean-check over the files it would leave, as a
  // rename does, and reports it, never refusing for new errors (w23/m42).
  revertCommit: {
    kind: "projection",
    proofs: [
      {
        file: DIFFERENTIAL_FILE,
        test: "reverting the commit that broke a file adds no errors",
      },
    ],
    differential: DIFFERENTIAL_CASE,
    exception:
      "no surface refuses the commit for new errors (it reports them, as the preview does), and only a conflict with a later commit refuses it",
  },
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

/** The tools the differential test has a case for, read off its `CASES` table. */
function differentialCaseTools(): string[] {
  const source = readFileSync(join(FEATURES, DIFFERENTIAL_FILE), "utf8");
  return [
    ...new Set([...source.matchAll(/^\s+tool: "(\w+)",$/gm)].map((m) => m[1])),
  ];
}

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

  const differentials = Object.entries(WRITE_PREVIEW_RULES).flatMap(
    ([tool, entry]) =>
      entry.kind === "projection" ? [[tool, entry.differential] as const] : [],
  );

  it.each(differentials)(
    "%s has a preview-versus-commit case, or says why it cannot: %j",
    (tool, differential) => {
      if ("reason" in differential) {
        expect(differential.reason.length).toBeGreaterThan(40);
        return;
      }
      expect(differentialCaseTools()).toContain(tool);
    },
  );

  it("has no differential case for a tool the registry does not mark as having one", () => {
    const registered = differentials
      .filter(([, differential]) => "case" in differential)
      .map(([tool]) => tool);
    expect(differentialCaseTools().sort()).toEqual(
      [...new Set(registered)].sort(),
    );
  });

  it.each(
    Object.entries(WRITE_PREVIEW_RULES).flatMap(([tool, entry]) =>
      entry.kind === "projection" && entry.exception
        ? [[tool, entry.exception] as const]
        : [],
    ),
  )(
    "%s departs from the projection rule, for a stated reason: %s",
    (_t, why) => {
      expect(why.length).toBeGreaterThan(40);
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
