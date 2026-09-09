import { HOSTED_APP_ORIGIN, normalizeOrigin } from "./resolve-app-link";

export type BuildLedgerUrlInput =
  | { kind: "home"; ledgerFullName: string }
  | { kind: "account"; ledgerFullName: string; account: string }
  | { kind: "journal"; ledgerFullName: string }
  | { kind: "commit"; ledgerFullName: string; sha: string }
  | { kind: "file"; ledgerFullName: string; branch: string; path: string }
  | { kind: "income-statement"; ledgerFullName: string }
  | { kind: "balance-sheet"; ledgerFullName: string }
  | { kind: "budget"; ledgerFullName: string }
  | { kind: "entry"; ledgerFullName: string; entryHash: string };

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function ledgerBase(ledgerFullName: string): string {
  const [owner, ...rest] = ledgerFullName.split("/");
  const name = rest.join("/");
  if (!owner || !name) {
    throw new Error(`Invalid ledger full name: ${ledgerFullName}`);
  }
  return `/ledger/${encodePathSegment(owner)}/${encodePathSegment(name)}`;
}

/**
 * Build a canonical https ledger URL for the selected server origin.
 * Keep in sync with `resolveAppLink` — the round-trip unit test locks them.
 */
export function buildLedgerUrl(
  input: BuildLedgerUrlInput,
  origin: string = HOSTED_APP_ORIGIN,
): string {
  const base = normalizeOrigin(origin) + ledgerBase(input.ledgerFullName);

  switch (input.kind) {
    case "home":
      return base;
    case "account":
      return `${base}/account/${encodePathSegment(input.account)}`;
    case "journal":
      return `${base}/journal`;
    case "commit":
      return `${base}/commit/${encodePathSegment(input.sha)}`;
    case "file":
      return `${base}/files/blob/${encodePathSegment(input.branch)}/${input.path
        .split("/")
        .map(encodePathSegment)
        .join("/")}`;
    case "income-statement":
      return `${base}/income-statement`;
    case "balance-sheet":
      return `${base}/balance-sheet`;
    case "budget":
      return `${base}/budget`;
    case "entry":
      return `${base}/entry/${encodePathSegment(input.entryHash)}`;
  }
}
