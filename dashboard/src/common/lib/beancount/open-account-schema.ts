import { z } from "zod";
import { accountTokenProblem, type AccountTokenProblem } from "./account-token";

/** An account the ledger already opens, as the Accounts directory lists it. */
export interface ExistingAccount {
  openedAt: string;
  closedAt?: string | null;
}

export function buildOpenAccountSchema(
  prefixes: string[],
  messages: {
    required: string;
    mustStartWith: string;
    needsChild: (root: string) => string;
    /** Message for each reason the name is not a complete account token. */
    invalid: (problem: AccountTokenProblem) => string;
    /** Message for a name the ledger already opens, open or closed. */
    exists: (account: string, existing: ExistingAccount) => string;
  },
  existing: ReadonlyMap<string, ExistingAccount> = new Map(),
) {
  return z.object({
    date: z.iso.date(),
    account: z
      .string()
      .min(1, messages.required)
      .superRefine((val, ctx) => {
        if (prefixes.includes(val)) {
          ctx.addIssue({ code: "custom", message: messages.needsChild(val) });
          return;
        }
        if (
          prefixes.length > 0 &&
          !prefixes.some((prefix) => val.startsWith(`${prefix}:`))
        ) {
          ctx.addIssue({ code: "custom", message: messages.mustStartWith });
        }
        const problem = accountTokenProblem(val);
        if (problem) {
          ctx.addIssue({ code: "custom", message: messages.invalid(problem) });
        }
      })
      // A second `open` breaks the ledger, and a closed account cannot be
      // reopened. Names compare exactly, as Beancount's do.
      .superRefine((val, ctx) => {
        const account = existing.get(val);
        if (account) {
          ctx.addIssue({
            code: "custom",
            message: messages.exists(val, account),
          });
        }
      }),
  });
}

/** The localized message for an account the ledger already opens. */
export function accountExistsMessage(
  t: (key: string, params?: Record<string, string>) => string,
): (account: string, existing: ExistingAccount) => string {
  return (account, { openedAt, closedAt }) =>
    closedAt
      ? t("page.accounts.accountAlreadyClosed", { account, date: closedAt })
      : t("page.accounts.accountAlreadyOpen", { account, date: openedAt });
}

/**
 * The localized message for each `AccountTokenProblem`, shared by the Accounts
 * dialog and the Journal "Account" tab so both name the same reason.
 */
export function accountProblemMessage(
  t: (key: string, params?: Record<string, string>) => string,
): (problem: AccountTokenProblem) => string {
  return (problem) => {
    switch (problem.kind) {
      case "whitespace":
        return t("page.accounts.accountNameWhitespace");
      case "empty-component":
        return t("page.accounts.accountNameEmptyComponent");
      case "component-start":
        return t("page.accounts.accountNameComponentStart", {
          component: problem.component,
        });
      case "invalid-character":
        return t("page.accounts.accountNameInvalidCharacter", {
          component: problem.component,
        });
      default:
        return t("page.accounts.accountNameInvalid");
    }
  };
}
