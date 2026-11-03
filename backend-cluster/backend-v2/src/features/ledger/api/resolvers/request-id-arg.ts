import { Arg } from "type-graphql";
import { ENTRY_REQUEST_ID_DESCRIPTION } from "@/features/ledger/utils/entry-write-idempotency";

/** Every GraphQL entry write's optional retry key (w3/m61). */
export const RequestIdArg = () =>
  Arg("requestId", () => String, {
    nullable: true,
    description: ENTRY_REQUEST_ID_DESCRIPTION,
  });
