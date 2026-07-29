import { createIsomorphicFn } from "@tanstack/react-start";
import { getLedgerSearchParamsOnServer } from "./server";
import { getLedgerSearchParamsOnClient } from "./client";

export const getLedgerSearchParams = createIsomorphicFn()
  .client(getLedgerSearchParamsOnClient)
  .server(getLedgerSearchParamsOnServer);
