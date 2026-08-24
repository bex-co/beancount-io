import { type AuthChecker } from "type-graphql";
import { IContext } from "./context";
import { UnauthenticatedError } from "@/shared/errors";
import {
  assertIdentityCapability,
  type ApiScope,
  type OperationClass,
} from "@/server/api/identity";

const SCOPE_OPERATION: Record<ApiScope, OperationClass> = {
  "ledger.read": "read",
  "ledger.write": "write",
  "ledger.admin": "admin",
};

export const customAuthChecker: AuthChecker<IContext, ApiScope> = (
  { context, info },
  roles,
) => {
  const { identity } = context;
  if (!identity) {
    throw new UnauthenticatedError("Access denied! Please login to continue!");
  }

  const operation = roles[0]
    ? SCOPE_OPERATION[roles[0]]
    : info.operation.operation === "mutation"
      ? "write"
      : "read";
  assertIdentityCapability(identity, operation);
  return true;
};
