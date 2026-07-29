import { type LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";

export function getLedgerSearchParamsOnClient(): LedgerSearchParams {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    account: decodeURIComponent(searchParams.get("account") || ""),
    filter: decodeURIComponent(searchParams.get("filter") || ""),
    time: decodeURIComponent(searchParams.get("time") || ""),
  };
}
