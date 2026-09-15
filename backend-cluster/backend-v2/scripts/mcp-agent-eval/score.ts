/**
 * Deterministic scoring for `yarn mcp:agent-eval`.
 *
 * An agent's closing sentence is not evidence. A journey passes only when the
 * final answer contains every fact the fixture oracle expects AND the ledger
 * read back after the run holds exactly the permitted change. A state read that
 * fails is a harness error, never "unchanged" — otherwise an unreachable
 * endpoint would score every read-only journey as a pass.
 */

interface Fact {
  readonly id: string;
  readonly description: string;
  /** Every number must appear in the answer, compared to the cent and ignoring sign. */
  readonly numbers?: readonly string[];
  /** Every term must appear, case-insensitively. */
  readonly terms?: readonly string[];
  /** At least one term must appear, case-insensitively. */
  readonly anyTerms?: readonly string[];
}

interface ExpectedWrite {
  readonly date: string;
  readonly postings: readonly { readonly account: string; readonly amount: string; readonly currency: string }[];
}

export interface Journey {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly facts: readonly Fact[];
  /** The one transaction the journey authorizes; a journey without it is read-only. */
  readonly expectedWrite?: ExpectedWrite;
}

export interface Assertion {
  readonly id: string;
  readonly ok: boolean;
  readonly detail: string;
}

/** What the harness observed on the ledger after a run. */
export type LedgerState =
  | {
      readonly ok: true;
      readonly files: readonly string[];
      readonly content: string;
      readonly errorCount: number;
    }
  | { readonly ok: false; readonly reason: string };

export type Outcome = "pass" | "fail" | "incomplete" | "error";

const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

const cents = (raw: string): number => Math.round(Math.abs(Number(raw.replace(/[$,]/g, ""))) * 100);

export function scoreAnswer(answer: string, facts: readonly Fact[]): Assertion[] {
  const seen = new Set((answer.match(NUMBER) ?? []).map(cents));
  const lower = answer.toLowerCase();
  const has = (term: string) => lower.includes(term.toLowerCase());
  return facts.map((fact) => {
    const missing = [
      ...(fact.numbers ?? []).filter((n) => !seen.has(cents(n))),
      ...(fact.terms ?? []).filter((t) => !has(t)),
    ];
    if (fact.anyTerms?.length && !fact.anyTerms.some(has)) {
      missing.push(`one of: ${fact.anyTerms.join(" | ")}`);
    }
    return {
      id: `answer:${fact.id}`,
      ok: missing.length === 0,
      detail: missing.length ? `${fact.description}: missing ${missing.join(", ")}` : fact.description,
    };
  });
}

interface Posting {
  readonly account: string;
  readonly amount: string | null;
  readonly currency: string | null;
}

interface Transaction {
  readonly date: string;
  readonly header: string;
  readonly postings: Posting[];
}

const TRANSACTION = /^(\d{4}-\d{2}-\d{2})\s+(?:\*|!|txn)(?:\s|$)/;
const POSTING =
  /^\s+[*!]?\s*([A-Z][A-Za-z0-9-]*(?::[A-Za-z0-9][A-Za-z0-9-]*)+)(?:\s+(-?[\d,]*\.?\d+)\s+([A-Z][A-Z0-9'._-]*))?/;

const money = (raw: string) => (Math.round(Number(raw.replace(/,/g, "")) * 100) / 100).toFixed(2);
const squash = (line: string) => line.trim().replace(/\s+/g, " ");

/**
 * Just enough Beancount structure to compare two versions of one file:
 * transactions with their postings, and every other non-blank line. Balances
 * are never computed here — the expected figures come from the fixture oracle.
 */
function parseLedger(text: string): { transactions: Transaction[]; directives: string[] } {
  const transactions: Transaction[] = [];
  const directives: string[] = [];
  let current: Transaction | undefined;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      current = undefined;
      continue;
    }
    if (line.trimStart().startsWith(";")) continue;
    const header = TRANSACTION.exec(line);
    if (header) {
      current = { date: header[1], header: squash(line), postings: [] };
      transactions.push(current);
      continue;
    }
    if (current && /^\s/.test(line)) {
      const posting = POSTING.exec(line);
      if (posting) {
        current.postings.push({
          account: posting[1],
          amount: posting[2] ? money(posting[2]) : null,
          currency: posting[3] ?? null,
        });
      }
      continue;
    }
    current = undefined;
    directives.push(squash(line));
  }
  return { transactions, directives };
}

const transactionKey = (t: Transaction) =>
  [t.header, ...t.postings.map((p) => `${p.account} ${p.amount ?? ""} ${p.currency ?? ""}`).sort()].join("\n");

/** Multiset difference: each match consumes one occurrence, so duplicates count. */
function minus<T>(xs: readonly T[], ys: readonly T[], key: (x: T) => string): T[] {
  const remaining = new Map<string, number>();
  for (const y of ys) remaining.set(key(y), (remaining.get(key(y)) ?? 0) + 1);
  return xs.filter((x) => {
    const left = remaining.get(key(x)) ?? 0;
    if (left === 0) return true;
    remaining.set(key(x), left - 1);
    return false;
  });
}

function diffLedgers(before: string, after: string) {
  const b = parseLedger(before);
  const a = parseLedger(after);
  return {
    addedTransactions: minus(a.transactions, b.transactions, transactionKey),
    removedTransactions: minus(b.transactions, a.transactions, transactionKey),
    addedDirectives: minus(a.directives, b.directives, String),
    removedDirectives: minus(b.directives, a.directives, String),
  };
}

function matchesWrite(t: Transaction, expected: ExpectedWrite): boolean {
  if (t.date !== expected.date || t.postings.length !== expected.postings.length) return false;
  let elided = 0;
  return expected.postings.every((want) => {
    const got = t.postings.find((p) => p.account === want.account);
    if (!got) return false;
    if (got.amount === null) return ++elided === 1;
    return got.amount === money(want.amount) && got.currency === want.currency;
  });
}

const describeTransaction = (t: Transaction) =>
  `${t.header} [${t.postings.map((p) => `${p.account} ${p.amount ?? "(elided)"}`).join("; ")}]`;

/** Ledger text compared as written, ignoring trailing whitespace. */
export const normalizeText = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .trimEnd();

/** The ledger is exactly the fixture: same text, no other files, and valid. */
export const matchesFixture = (state: LedgerState, fixture: string, fixturePath: string) =>
  state.ok &&
  state.errorCount === 0 &&
  state.files.length === 1 &&
  state.files[0] === fixturePath &&
  normalizeText(state.content) === normalizeText(fixture);

export function scoreState(journey: Journey, fixture: string, fixturePath: string, state: LedgerState): Assertion[] {
  if (!state.ok) {
    return [
      { id: "state:read", ok: false, detail: `ledger state unavailable (${state.reason}); not treated as unchanged` },
    ];
  }
  const extraFiles = state.files.filter((f) => f !== fixturePath);
  const hasFixture = state.files.includes(fixturePath);
  const assertions: Assertion[] = [
    {
      id: "state:files",
      ok: extraFiles.length === 0 && hasFixture,
      detail: extraFiles.length
        ? `unexpected files: ${extraFiles.join(", ")}`
        : hasFixture
          ? `only ${fixturePath}`
          : `${fixturePath} is missing`,
    },
    { id: "state:valid", ok: state.errorCount === 0, detail: `${state.errorCount} validation error(s) after the run` },
  ];
  const diff = diffLedgers(fixture, state.content);
  const expected = journey.expectedWrite;

  if (!expected) {
    const unchanged = normalizeText(fixture) === normalizeText(state.content);
    assertions.push({
      id: "state:read-only",
      ok: unchanged,
      detail: unchanged
        ? "ledger unchanged"
        : `read-only journey changed the ledger: +${diff.addedTransactions.length}/-${diff.removedTransactions.length} transactions, +${diff.addedDirectives.length}/-${diff.removedDirectives.length} other lines`,
    });
    return assertions;
  }

  const preserved =
    diff.removedTransactions.length === 0 && diff.removedDirectives.length === 0 && diff.addedDirectives.length === 0;
  assertions.push({
    id: "state:existing-entries",
    ok: preserved,
    detail: preserved
      ? "existing entries preserved"
      : `unintended edits: -${diff.removedTransactions.length} transactions, +${diff.addedDirectives.length}/-${diff.removedDirectives.length} other lines`,
  });

  const added = diff.addedTransactions;
  const matching = added.filter((t) => matchesWrite(t, expected));
  assertions.push({
    id: "state:authorized-write",
    ok: added.length === 1 && matching.length === 1,
    detail:
      added.length === 0
        ? "the authorized write was not recorded"
        : added.length > 1
          ? `expected exactly one new transaction, found ${added.length} (duplicate or unintended writes)`
          : matching.length === 1
            ? "exactly one matching transaction added"
            : `the new transaction does not match: ${describeTransaction(added[0])}`,
  });
  return assertions;
}

/**
 * A run is incomplete when the client never produced a usable result, an error
 * when the harness could not read the ledger, and only then pass or fail.
 */
export function classify(incompleteReason: string | null, assertions: readonly Assertion[]): Outcome {
  if (incompleteReason) return "incomplete";
  if (assertions.some((a) => a.id === "state:read" && !a.ok)) return "error";
  return assertions.length > 0 && assertions.every((a) => a.ok) ? "pass" : "fail";
}

/**
 * The harness resets and rewrites its target, so it refuses any ledger that is
 * not a dedicated eval ledger or any credential that reaches more than it.
 */
export function unsafeTargetReason(target: string, accessible: readonly string[]): string | null {
  if (!/^[^/\s]+\/mcp-agent-eval(?:-[a-z0-9-]+)?$/.test(target)) {
    return `refusing to reset ${target}: the target must be a dedicated ledger named mcp-agent-eval[-suffix]`;
  }
  if (accessible.length !== 1 || accessible[0] !== target) {
    return `refusing to run: the credential must reach exactly ${target}, but it reaches ${accessible.length} ledger(s)`;
  }
  return null;
}

export function redact(text: string, secrets: readonly string[], owner?: string): string {
  let out = text.replace(/bcio_[A-Za-z0-9]{6,}/g, "bcio_<redacted>");
  for (const secret of secrets) if (secret) out = out.split(secret).join("<redacted>");
  // The owner appears as a path segment, a JSON field, a URL part, and in prose.
  if (owner) out = out.replace(new RegExp(`(?<![\\w-])${owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g"), "<qa-owner>");
  return out;
}
