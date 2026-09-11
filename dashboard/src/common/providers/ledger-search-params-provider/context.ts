import { createContext } from "react";

export interface LedgerSearchParams {
  account: string;
  filter: string;
  time: string;
  conversion: string;
}

interface ILedgerSearchParamsContext {
  searchParams: LedgerSearchParams;
  setSearchParams: (searchParams: LedgerSearchParams) => void;
}

const defaultSearchParams: LedgerSearchParams = {
  account: "",
  filter: "",
  time: "",
  conversion: "",
};

export const LedgerSearchParamsContext =
  createContext<ILedgerSearchParamsContext>({
    searchParams: defaultSearchParams,
    setSearchParams: () => {},
  });
