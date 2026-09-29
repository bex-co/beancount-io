import { createContext, useContext } from "react";
import type { ReactiveVar } from "@apollo/client";
import type { JournalTransaction } from "@/screens/transactions-screen/types";
import type { ScopedTransactionFilters } from "@/screens/transactions-screen/filters/types";
import type { ExampleId, GuestView } from "./guest-state";

export const GuestContext = createContext<{
  ledgerId: ExampleId;
  transactionFilters: ReactiveVar<ScopedTransactionFilters>;
  selectedTransaction: ReactiveVar<JournalTransaction | null>;
  navigate: (view: GuestView) => void;
  requestSignIn: () => void;
} | null>(null);

export const useGuest = () => useContext(GuestContext);
