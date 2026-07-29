import { getRequest } from "@tanstack/react-start/server";
import { type LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";

export function getLedgerSearchParamsOnServer(): LedgerSearchParams {
  const request = getRequest();
  const searchParams = new URL(request.url).searchParams;
  return {
    account: decodeURIComponent(searchParams.get("account") || ""),
    filter: decodeURIComponent(searchParams.get("filter") || ""),
    time: decodeURIComponent(searchParams.get("time") || ""),
  };
}
