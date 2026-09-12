import { z } from "zod";
import type { Identity } from "@/server/api/identity";

/**
 * The MCP `prompts` fragment (w2/008).
 *
 * A hosted agent reaches this server over HTTP and cannot see `skills/` — the
 * ledger playbooks that teach an agent how to close a month, reconcile against
 * a statement, categorize an import, or answer a spending question only exist
 * on a filesystem the caller does not have. The field audit watched three
 * sessions rediscover those procedures badly, one turn at a time.
 *
 * Prompts are the protocol's answer: user-initiated, explicitly selected, and
 * free of the selection-attention cost that makes a tool expensive to add
 * (ADR 0008 D2 draws the same line between tools and resources). So the bodies
 * here are the `skills/.claude/skills/beancount-*` playbooks rewritten against
 * the MCP tools — the same phases, the same refusals, the same confirm gates,
 * with `bea` invocations replaced by the tool that does the equivalent work.
 *
 * They are static text. A prompt performs no domain work, touches no service,
 * and therefore carries no authorization action of its own: everything a
 * playbook tells the agent to do is gated where it happens, by the tool or
 * resource it names. What the credential *is* still shapes the text — a pinned
 * credential is told its ledger rather than told to go find one.
 */

/** MCP prompt arguments are strings on the wire; every one here is optional. */
type PromptArgs = Record<string, z.ZodOptional<z.ZodString>>;

export interface McpPromptDescriptor {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly argsSchema: PromptArgs;
  /** The playbook, with the caller's arguments and ledger pin folded in. */
  readonly build: (
    args: Record<string, string | undefined>,
    identity: Identity,
  ) => string;
}

const optionalArg = (description: string) =>
  z.string().optional().describe(description);

const ledgerArg = optionalArg(
  "Target ledger as owner/name. Required for an unpinned credential; defaults to the credential's ledger restriction.",
);

/**
 * How the playbook should talk about ledger selection for this caller.
 *
 * Repeating `ledger: owner/name` in every step of four playbooks would be
 * noise for the pinned credential that is the common case, and omitting it
 * entirely would leave an unpinned one to rediscover the rule the instructions
 * already state. One line at the top, resolved per request.
 */
function ledgerLine(identity: Identity, requested: string | undefined): string {
  const pin = identity.ledgerScope;
  // The pin is a ceiling here exactly as it is in `resolveMcpLedger`. A
  // playbook that echoed a ledger outside it would read as an instruction,
  // and the agent would spend its first calls discovering by 403 what this
  // line can just say.
  if (pin && requested && requested !== pin) {
    return `Ledger: ${pin}. You asked for ${requested}, which is outside this credential's ledger restriction — every call below targets ${pin} or is refused.`;
  }
  const selected = requested ?? pin;
  if (selected) {
    return `Ledger: ${selected}. Pass \`ledger: "${selected}"\` on every ledger-targeted call, or omit it if your credential is pinned there.`;
  }
  return "Ledger: not selected. Call `listLedgers` first and pass `ledger: owner/name` on every ledger-targeted call below.";
}

/** The contract every playbook inherits, stated once per prompt body. */
const GROUND_RULES = [
  "Ground rules for this playbook:",
  "- Every figure you state must come from a call you actually made. Do not compute money in your head, and do not estimate.",
  "- Never invent an account. The candidate set is exactly what `getLedgerContext` returns.",
  "- Never fabricate an entry to make something tie out. A gap is a finding you report, not a hole you fill.",
  "- Writes are confirm-gated: show the user what you will write, and write only after an explicit yes.",
  "- After any write, read `validation.newErrors` from the result or call `checkLedger`. A red ledger blocks the next phase.",
].join("\n");

const closeMonth = (
  args: Record<string, string | undefined>,
  identity: Identity,
): string =>
  [
    `Close the books for ${args.month ?? "the last complete calendar month"}.`,
    "",
    ledgerLine(identity, args.ledger),
    "",
    GROUND_RULES,
    "",
    "Work these seven phases in order and announce a one-line status as each finishes",
    "(e.g. `Reconcile: 2 tied, 1 unverified (no statement)`).",
    "",
    "1. Scope. Resolve the period and state the exact date range you resolved it to.",
    "   Call `checkLedger` first — a ledger that starts red must be fixed before a close",
    "   means anything; surface the errors and stop. Then enumerate active accounts: every",
    "   Assets/Liabilities account with postings in the period or a nonzero balance. Get them",
    "   from `getLedgerContext`, and the period's activity from `runBqlQueryStructured`.",
    "2. Reconcile. For each active account, ask the user for the period statement. With one,",
    "   run the `reconcile-account` prompt's procedure for that account — outcome `tied`, or",
    "   `partial` when you correctly withhold the assertion over unresolved suspects. Without",
    "   one, the account is `unverified` and is listed in the report. Never silently pass it.",
    "3. Assert. Every reconciled account should now have a `balance` assertion dated on or",
    "   after period end. Query for them; accounts without one are `unpinned` in the report.",
    "4. Recurring completeness. Find payees present in each of the prior two or three months",
    "   at a steady amount but absent this period. Each gap is a question for the user",
    '   ("NETFLIX appeared Apr and May, absent in Jun — charge missing, cancelled, or card',
    '   changed?"), never an entry you write.',
    "5. Flags. List every `!`-flagged entry dated in or before the period. Each is either",
    "   resolved by the user now or carried forward — counted in the report either way.",
    "6. Report. Produce the period's income statement with `runBqlQueryStructured` and",
    "   assemble the close report: reconciled accounts, unverified accounts, assertions",
    "   pinned/unpinned, recurring gaps, flags carried, income, expenses, net, and the",
    "   `checkLedger` result. Show every query you ran.",
    "7. Commit. Only when the check passes. This server commits on every write, so there is",
    "   no separate commit step: instead, confirm the close report with the user and make",
    "   the period's last write carry it. Pass the close report as the `description` on the",
    "   final `addLedgerEntries` or `editLedgerFiles` call so `git log` reads as a close",
    "   history. If nothing remains to write, say the close is complete and leave the ledger",
    "   untouched.",
    "",
    "Do not skip or hide anything: unverified accounts, unpinned assertions, recurring gaps,",
    "and carried flags all appear in the report with counts. Do not propose a write while the",
    "check is red.",
  ].join("\n");

const reconcileAccount = (
  args: Record<string, string | undefined>,
  identity: Identity,
): string =>
  [
    `Reconcile ${args.account ?? "one account (ask me which)"} against ${
      args.period ? `the ${args.period} statement` : "one statement period"
    }.`,
    "",
    ledgerLine(identity, args.ledger),
    args.statement
      ? ["", "Statement provided by the user:", "", args.statement].join("\n")
      : "",
    "",
    GROUND_RULES,
    "",
    "Five phases, in order: Discover, Normalize, Match, Propose, Verify.",
    "",
    "1. Discover. Establish, and report back before continuing so a misdetection is caught",
    "   early: the single target account (ask if ambiguous — never guess which account a",
    "   statement belongs to); whether it is an Assets or a Liabilities account, which fixes",
    "   the sign convention; and the most recent `balance` assertion for it, which is the",
    "   trusted starting point you reconcile forward from. `getLedgerContext` gives the",
    "   accounts; `runBqlQueryStructured` gives the prior assertion and the period's postings.",
    "2. Normalize. Turn the statement into lines of date, amount, description, and extract the",
    "   statement period and the ending balance — both are required, because the assertion",
    "   depends on them. Map every amount to the ledger's sign convention for this account:",
    "   for an Assets account money in is `+` and money out is `-`; for a Liabilities account",
    "   a charge is `-` and a payment is `+`. Statements vary (split debit/credit columns,",
    "   signed amounts, running balances, MDY vs DMY). When the sign or date convention is",
    "   ambiguous, ask — a flipped sign silently corrupts the whole reconciliation.",
    "3. Match. Diff the normalized lines against the ledger's postings to this account in the",
    "   period, and classify each discrepancy:",
    "   - matched — agree; no action.",
    "   - missing-in-ledger — on the statement, not in the ledger; propose a new transaction.",
    "   - missing-on-statement — in the ledger, not on the statement; report as a suspect.",
    "   - duplicate — recorded twice in the ledger; report for manual review.",
    "   - amount-mismatch — same payee and date, different amounts; report for manual review.",
    "   - date-drift — same transaction, dates differ (pending vs settled); treat as matched",
    "     and note the drift.",
    "   You only ever append. Duplicates, suspects, and mismatches are reported for the user",
    "   to fix by hand; do not edit or delete existing entries to force a tie-out.",
    "4. Propose. Show the user a table of every discrepancy and exactly what you will append:",
    "   the missing transactions, and one period-end `balance` assertion at the statement's",
    "   ending balance. If unresolved suspects or mismatches remain, withhold the assertion and",
    "   say why — a partial reconciliation reported honestly beats a green one that is wrong.",
    "   Wait for an explicit yes.",
    "5. Verify. Append with one `addLedgerEntries` call carrying the transactions and the",
    "   `balance` entry, with a `description` naming the account and period. Then read",
    "   `validation.newErrors`, or call `checkLedger`. The assertion passing is what",
    "   reconciliation means; if it fails, report the residual rather than adjusting anything",
    "   to make it pass.",
  ]
    .filter((line) => line !== "")
    .join("\n");

const categorizeImports = (
  args: Record<string, string | undefined>,
  identity: Identity,
): string =>
  [
    "Categorize the bank transactions waiting in staging and write the confirmed ones into",
    "the ledger.",
    "",
    ledgerLine(identity, args.ledger),
    args.item_id ? `Linked bank: ${args.item_id}.` : "",
    "",
    GROUND_RULES,
    "",
    "1. Pull. Read `beancount://{owner}/{name}/bank/list` (or call `manageBankImport` with",
    '   `operation: "sync"` and the bank\'s `item_id`) to bring new transactions into staging.',
    "   `sync` accepts `dry_run` — use it first if you want to see what would arrive.",
    "2. Stage. Read the unsynced transactions and the server's own suggestions from the bank",
    "   resources. Nothing is in the ledger yet; everything here is a candidate.",
    "3. Dedup. Before proposing anything, check each candidate against what the ledger already",
    "   holds: query postings to the source account at the same amount within three days with",
    "   a similar description. A hit is a *suspected duplicate* — show it in the review table",
    "   for the user to keep or skip. Never silently skip one, and never silently double-enter",
    "   one. Importing the same window twice must yield zero new entries the second time.",
    "4. Suggest. Categorize each candidate's counter-account from the ledger's own history.",
    "   The candidate set is exactly the accounts `getLedgerContext` returns — never invent an",
    "   account, however plausible. A confident prior for the payee is reused and cited as the",
    "   reason; without one, use `Expenses:Uncategorized` and flag it for refinement. Every",
    "   suggestion carries a confidence (high/medium/low) and a one-line reason.",
    "5. Confirm. Show the user the full review table — date, payee, amount, proposed account,",
    "   confidence, reason, and the duplicate flags — and ask. Never write before an explicit",
    "   yes. Let the user correct accounts in bulk before you write.",
    '6. Write and verify. Call `manageBankImport` with `operation: "submit"` and the confirmed',
    "   `transactions`, each with its `target_account`. Run it once with `dry_run: true` first",
    "   and show the result. Then read `validation.newErrors` from the real call, or call",
    "   `checkLedger`, and report the outcome with counts: written, skipped as duplicates,",
    "   left uncategorized.",
    "",
    'Staged transactions the user rejects are removed with `operation: "discard"`, not left',
    "to reappear on the next sync.",
  ]
    .filter((line) => line !== "")
    .join("\n");

const spendingReport = (
  args: Record<string, string | undefined>,
  identity: Identity,
): string =>
  [
    `Answer questions about this ledger's spending for ${
      args.period ?? "a period I will name"
    }${args.question ? `, starting with: ${args.question}` : ""}.`,
    "",
    ledgerLine(identity, args.ledger),
    "",
    "This playbook is strictly read-only. Do not write, edit, or format anything — not to fix",
    "an error you notice, not to add a missing `open`. If an answer would require a write, name",
    "the tool that does it and stop.",
    "",
    "1. Orient. Call `getLedgerContext` for the account and payee vocabulary, and read",
    "   `beancount://{owner}/{name}/errors` — a figure from a ledger with errors needs that",
    "   caveat attached.",
    "2. Resolve the question. Establish the period explicitly against today's date and state",
    "   the resolved date range in your answer. If the question is ambiguous (which period?",
    "   which category? total or average?), ask — a precise answer to the wrong question reads",
    "   as authoritative and misleads.",
    "3. Query. Use `runBqlQueryStructured` so you get typed numbers rather than a rendered",
    "   table you have to re-parse. Remember what the rows are: BQL rows are *postings*, so",
    "   `LIMIT 5` is five postings, not five transactions.",
    "   Sign and scope traps that produce confidently wrong answers:",
    "   - Income accounts accumulate negative; Expenses accumulate positive.",
    "   - Transfers between your own accounts are not spending.",
    "   - A credit-card payment is not spending — the purchases it settles already were.",
    "   - Select `^Expenses:` to mean spending, and use `cost(position)` for currency totals.",
    "4. Answer. Lead with the figure, in a sentence or a small table. Show the query underneath",
    "   so the user can re-run or refine it. Say what the data cannot show when it matters",
    '   ("transfers excluded; market values need price directives this ledger does not have").',
    "5. When the data cannot answer — missing period, no such account or payee, something the",
    "   ledger does not track — say exactly what is missing and what would make it answerable.",
    "   Never estimate. If you extrapolate at all, label it as arithmetic on top of the queried",
    "   figures, and keep even that minimal.",
    "",
    "Every figure you state must have come out of a query you show. A fluent but unverifiable",
    "answer about money is worse than no answer.",
  ].join("\n");

/** The MCP fragment: every prompt this feature contributes to the registry. */
export const MCP_PROMPTS: readonly McpPromptDescriptor[] = [
  {
    name: "close-month",
    title: "Close The Month",
    description:
      "Month-end close ritual: reconcile active accounts, verify balance assertions, check recurring-entry completeness, sweep flagged entries, and report the period's P&L. Reports what it cannot verify instead of forcing a tie-out.",
    argsSchema: {
      month: optionalArg(
        "Period to close as YYYY-MM. Defaults to the last complete calendar month.",
      ),
      ledger: ledgerArg,
    },
    build: closeMonth,
  },
  {
    name: "reconcile-account",
    title: "Reconcile An Account Against A Statement",
    description:
      "Diff one account against one statement period, classify every discrepancy, and — after confirmation — append the missing transactions plus a period-end balance assertion that proves the account ties out.",
    argsSchema: {
      account: optionalArg(
        "The single account to reconcile, e.g. Assets:Bank:Checking.",
      ),
      period: optionalArg("The statement period, e.g. 2026-06."),
      statement: optionalArg(
        "The statement itself: CSV text or pasted PDF text. Omit it to be asked for it.",
      ),
      ledger: ledgerArg,
    },
    build: reconcileAccount,
  },
  {
    name: "categorize-imports",
    title: "Categorize Staged Bank Transactions",
    description:
      "Sync a linked bank, deduplicate the staged transactions against what the ledger already holds, propose a counter-account for each from the ledger's own history, and write the confirmed ones.",
    argsSchema: {
      item_id: optionalArg(
        "The linked bank's id. Omit it to work with whatever is already staged.",
      ),
      ledger: ledgerArg,
    },
    build: categorizeImports,
  },
  {
    name: "spending-report",
    title: "Report On Spending",
    description:
      "Answer analytical questions about the ledger with shown, re-runnable BQL — spending, trends, net worth, burn rate, subscriptions. Strictly read-only; every figure comes from a query the user can see.",
    argsSchema: {
      period: optionalArg(
        "The period to report on, e.g. 2026-06 or last quarter.",
      ),
      question: optionalArg(
        "A specific question to start from, e.g. how much did I spend on groceries.",
      ),
      ledger: ledgerArg,
    },
    build: spendingReport,
  },
];
