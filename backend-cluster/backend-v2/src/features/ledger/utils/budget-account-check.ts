import { type FavaApiClient, unwrapFavaResponse } from "@/foundation/fava";
import { ValidationError } from "@/shared/errors";
import type { ReportedProjection } from "@/features/ledger/utils/bean-check-errors";
import type { ParsedDirective } from "@/features/ledger/utils/directive-text";

interface BudgetAccountRef {
  readonly index: number;
  readonly account: string;
}

interface BudgetAccountsFavaClient {
  reports: Pick<FavaApiClient["reports"], "getLedgerAccounts">;
}

/** Account tokens start with an uppercase, titlecase, or caseless letter (w31/081). */
const ACCOUNT_START = /^[\p{Lu}\p{Lt}\p{Lo}]/u;
const OPEN_ACCOUNT = /^\d{4}-\d{2}-\d{2}[ \t]+open[ \t]+([^\s";]+)/;
const BUDGET_ACCOUNT =
  /^\d{4}-\d{2}-\d{2}[ \t]+custom[ \t]+"budget"[ \t]+([^\s";]+)/;

/** First non-blank, non-comment line of a parsed directive's text. */
function headerLineOf(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith(";")) continue;
    return line;
  }
  return undefined;
}

function budgetAccountFromHeader(header: string): string | undefined {
  const account = BUDGET_ACCOUNT.exec(header)?.[1];
  return account && ACCOUNT_START.test(account) ? account : undefined;
}

/**
 * Extract the `custom "budget"` account token from a single-directive text
 * slice (e.g. `updateSourceSlice`'s `newContent`), or `undefined` when its
 * header is not a `custom "budget"` directive (w31/096).
 */
export function extractSingleBudgetAccount(text: string): string | undefined {
  const header = headerLineOf(text);
  return header ? budgetAccountFromHeader(header) : undefined;
}

/**
 * Collect `custom "budget"` account tokens (with their 0-based directive
 * index) and accounts opened by `open` directives in the same parsed text
 * (w31/094). Non-budget `custom` directives and non-account tokens are ignored.
 */
export function extractDirectiveBudgetAccounts(
  directives: readonly ParsedDirective[],
): {
  budgets: BudgetAccountRef[];
  openedInCall: string[];
} {
  const budgets: BudgetAccountRef[] = [];
  const openedInCall: string[] = [];
  directives.forEach((directive, index) => {
    if (directive.kind !== "Custom" && directive.kind !== "Open") return;
    const header = headerLineOf(directive.text);
    if (!header) return;
    if (directive.kind === "Open") {
      const account = OPEN_ACCOUNT.exec(header)?.[1];
      if (account && ACCOUNT_START.test(account)) openedInCall.push(account);
      return;
    }
    const account = budgetAccountFromHeader(header);
    if (account) {
      budgets.push({ index, account });
    }
  });
  return { budgets, openedInCall };
}

/**
 * A budget is a `custom "budget"` directive, whose account bean-check never
 * reads: one for an account the ledger lacks was committed with "no new
 * bean-check errors", and no report ever matched it (w23/071, w31/094,
 * w31/096). Its account must be opened, or be a parent of an opened one
 * (w21/396), in the ledger or by an `open` in the same call.
 */
export async function checkBudgetAccountsExist(params: {
  favaApiClient: BudgetAccountsFavaClient;
  ledgerOwner: string;
  ledgerName: string;
  budgets: readonly BudgetAccountRef[];
  openedInCall: readonly string[];
  field: "entries" | "text" | "newContent";
  itemLabel: "entry" | "directive";
}): Promise<ValidationError[]> {
  const {
    favaApiClient,
    ledgerOwner,
    ledgerName,
    budgets,
    openedInCall,
    field,
    itemLabel,
  } = params;
  if (budgets.length === 0) return [];
  const opened = [
    ...Object.keys(
      await unwrapFavaResponse(
        favaApiClient.reports.getLedgerAccounts(ledgerOwner, ledgerName),
        "get ledger accounts",
      ),
    ),
    ...openedInCall,
  ];
  const under = (parent: string) => (candidate: string) =>
    candidate === parent || candidate.startsWith(`${parent}:`);
  const openAction =
    field === "newContent"
      ? "open the account first"
      : "add its `open` to the same call";
  const hint = `Budget an account the ledger opens, or a parent of one; ${openAction}; or pass \`allowInvalid: true\` to record the budget anyway.`;
  const issues: ValidationError[] = [];
  for (const { index, account } of budgets) {
    if (opened.some(under(account))) continue;
    // The opened accounts beside it, under its deepest existing parent.
    const segments = account.split(":");
    let nearest: string[] = [];
    for (let depth = segments.length - 1; depth > 0; depth -= 1) {
      nearest = opened.filter(under(segments.slice(0, depth).join(":")));
      if (nearest.length > 0) break;
    }
    const suggestion =
      nearest.length > 0
        ? `; nearest: ${[...new Set(nearest)].sort().slice(0, 3).join(", ")}`
        : "";
    issues.push(
      new ValidationError(
        field,
        `${itemLabel} ${index}: budget account ${account} is not opened in this ledger, nor is any account under it${suggestion}`,
        hint,
        { [itemLabel]: index, account },
      ),
    );
  }
  return issues;
}

/** A preview's projection with the budget findings added as new errors (w23/221, w31/094). */
export function withBudgetIssues(
  validation: ReportedProjection,
  issues: readonly ValidationError[],
): ReportedProjection {
  if (issues.length === 0) return validation;
  return {
    errorsBefore: validation.errorsBefore,
    errorsAfter: validation.errorsAfter + issues.length,
    newErrors: [
      ...validation.newErrors,
      ...issues.map((issue) => ({ message: issue.message })),
    ],
    valid: false,
  };
}
