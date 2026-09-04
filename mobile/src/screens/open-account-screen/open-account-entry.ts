import { getFormatDate } from "../../common/format-util";
import type {
  AddEntryInput,
  LedgerEntryType,
} from "../../generated-graphql/types";

export type OpenAccountInput = {
  account: string;
  currencies: string[];
  date: Date;
};

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
      date: getFormatDate(date),
    },
  };
}
