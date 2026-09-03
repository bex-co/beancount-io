import type { MiddlewareFn } from "type-graphql";
import type { IContext } from "./context";
import { assertLedgerScope } from "@/features/ledger/utils/authorize-ledger";
import { authorizationActionForOp } from "@/server/api/op-class";
import { graphqlOperationId } from "./graphql-operation-id";

/**
 * Compatibility pin gate for operations not yet migrated to the PDP.
 * Migrated root operations are skipped because their protected service or
 * workflow evaluates the pin together with credentials and relationships.
 * Nullable legacy ledger IDs still resolve and authorize their default at the
 * legacy application boundary.
 */
export function graphqlLedgerPinMiddleware(): MiddlewareFn<IContext> {
  return ({ context, args, info }, next) => {
    const opId = graphqlOperationId(info);
    if (opId && authorizationActionForOp(opId)) {
      return next();
    }
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
