import type { MiddlewareFn } from "type-graphql";
import type { IContext } from "./context";
import { assertLedgerScope } from "@/features/ledger/utils/authorize-ledger";

/**
 * The GraphQL half of the per-credential ledger pin (ADR 0006 D5).
 *
 * `Identity.ledgerScope` confines a credential to one ledger — an OAuth grant
 * the user consented to for a single book, or an API key minted against one.
 * The op-class gate beside this one asks "may this credential do a write?";
 * this asks "may it do it *here?*", and nothing on this surface did.
 *
 * A global middleware rather than a call in each resolver, for the same reason
 * `graphqlScopeMiddleware` is one: a verb that forgets the line is a verb with
 * no pin, and there are 80-odd ledger-addressed fields across the ledger,
 * Plaid, LLM, commits, pull-request and legacy families to forget it in.
 * Reading the argument centrally means a new resolver is covered the day it is
 * written.
 *
 * Deliberately keyed on the ARGUMENTS rather than the resolver, in the two
 * spellings the schema actually uses to name a ledger:
 *
 *  - `ledgerId`, the `owner/name` string, whether declared with
 *    `@Arg("ledgerId")` or as a `@Field` on an `@ArgsType` class (TypeGraphQL
 *    flattens both into the same args object) — 82 fields.
 *  - `ledgerOwner` + `ledgerName`, the split pair the pull-request family
 *    takes, which addresses exactly the same ledger with a different shape.
 *
 * `__tests__/ledger-pin-guard.test.ts` walks the built schema and fails if a
 * field's ledger arguments are spelled some third way, so the convention
 * cannot quietly drift out from under this.
 *
 * Three things this deliberately does NOT cover, each handled at its own seam:
 *  - Fields taking the ledger from their parent object rather than an argument
 *    (`Ledger.attributes` and friends read `root.id`), which call
 *    `assertLedgerScope` themselves.
 *  - Fields taking it inside an input object (`createPullRequestFromPatch`),
 *    likewise.
 *  - `getLedgerAssetDownloadUrl`, addressed by the numeric `ledgerRepoId`:
 *    only an admin lookup can turn that into a ledger id, so the pin is
 *    enforced in `LedgerAssetService` after that resolution, via
 *    `authorizeLedger`.
 *  - The legacy family's absent-`ledgerId` default, which resolves to a ledger
 *    no argument named — see `BaseLedgerResolver.resolveLedgerId`.
 */
export function graphqlLedgerPinMiddleware(): MiddlewareFn<IContext> {
  return ({ context, args }, next) => {
    const ledgerId = ledgerIdFromArgs(args as Record<string, unknown>);
    // An absent ledger argument is not a refusal — the legacy verbs declare
    // `ledgerId` nullable and resolve a default themselves, and most fields
    // name no ledger at all.
    if (ledgerId) {
      assertLedgerScope(context.identity, ledgerId);
    }
    return next();
  };
}

/**
 * The ledger a field's arguments name, in whichever spelling they use.
 *
 * Every field, not just root ones: the pin belongs wherever the argument is
 * read.
 */
function ledgerIdFromArgs(args: Record<string, unknown>): string | undefined {
  const { ledgerId, ledgerOwner, ledgerName } = args;
  if (typeof ledgerId === "string" && ledgerId) {
    return ledgerId;
  }
  if (
    typeof ledgerOwner === "string" &&
    ledgerOwner &&
    typeof ledgerName === "string" &&
    ledgerName
  ) {
    return `${ledgerOwner}/${ledgerName}`;
  }
  return undefined;
}
