import type {
  AddEntryInput,
  LedgerEntryType,
} from "../../generated-graphql/types";

export type OpenAccountInput = {
  account: string;
  currencies: string[];
  date: Date;
};

/** Format a local calendar date without allowing UTC conversion to shift it. */
export function formatOpenAccountDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Build the single schema input that writes a Beancount `open` directive. */
export function buildOpenAccountEntry({
  account,
  currencies,
  date,
}: OpenAccountInput): AddEntryInput {
  return {
    type: "OPEN" as LedgerEntryType,
    open: {
      account,
      currencies: [...currencies],
      date: formatOpenAccountDate(date),
    },
  };
}
