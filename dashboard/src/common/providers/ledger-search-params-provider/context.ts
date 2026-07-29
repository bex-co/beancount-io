import { createContext } from "react";

export interface LedgerSearchParams {
  account: string;
  filter: string;
  time: string;
}

interface ILedgerSearchParamsContext {
  searchParams: LedgerSearchParams;
  setSearchParams: (searchParams: LedgerSearchParams) => void;
}

const defaultSearchParams: LedgerSearchParams = {
  account: "",
  filter: "",
  time: "",
};

export const LedgerSearchParamsContext =
  createContext<ILedgerSearchParamsContext>({
    searchParams: defaultSearchParams,
    setSearchParams: () => {},
  });
