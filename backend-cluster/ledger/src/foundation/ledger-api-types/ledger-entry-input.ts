// Extracted verbatim from the donor branch's ledger-entry-service
// (rustledger-port:backend-cluster/backend-v2/src/features/ledger/service/ledger-entry-service.ts)
// so the engine's entry-build module has no service-layer dependency. The
// adapted entry service must import LedgerEntryInput from here.

export type AmountInput = { number: string; currency: string };

export type PostingInput = {
  units: AmountInput;
  account: string;
  price?: AmountInput;
  flag?: string;
};

export type TransactionInput = {
  date: string;
  flag: string;
  payee?: string;
  narration?: string;
  postings: PostingInput[];
  tags?: string[];
  links?: string[];
  meta?: Record<string, string>;
};

export type CommodityInput = { date: string; currency: string };

export type PriceInput = {
  date: string;
  currency: string;
  amount: AmountInput;
};

export type NoteInput = { date: string; content: string; account: string };

export type BalanceInput = {
  date: string;
  account: string;
  amount: AmountInput;
};

export type OpenInput = { date: string; account: string; currencies: string[] };

export type CloseInput = { date: string; account: string };

export type DocumentInput = {
  date: string;
  account: string;
  filename: string;
  tags?: string[];
  links?: string[];
};

export type EventInput = {
  date: string;
  type: string;
  description: string;
};

export type BudgetInput = {
  date: string;
  account: string;
  interval: string;
  amount: AmountInput;
};

/**
 * Discriminated union of all supported entry inputs. Every variant shares the
 * uniform `{ type, entry }` shape; `type` selects how `entry` is rendered to
 * beancount text (`entryInputToText`) and which file it is routed to.
 */
export type LedgerEntryInput =
  | { type: "transaction"; entry: TransactionInput }
  | { type: "commodity"; entry: CommodityInput }
  | { type: "price"; entry: PriceInput }
  | { type: "note"; entry: NoteInput }
  | { type: "balance"; entry: BalanceInput }
  | { type: "open"; entry: OpenInput }
  | { type: "close"; entry: CloseInput }
  | { type: "budget"; entry: BudgetInput }
  | { type: "document"; entry: DocumentInput }
  | { type: "event"; entry: EventInput };
