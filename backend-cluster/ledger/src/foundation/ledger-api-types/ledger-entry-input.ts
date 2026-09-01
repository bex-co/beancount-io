// Extracted verbatim from the donor branch's ledger-entry-service
// (rustledger-port:backend-cluster/backend-v2/src/features/ledger/service/ledger-entry-service.ts)
// so the engine's entry-build module has no service-layer dependency. The
// adapted entry service must import LedgerEntryInput from here.

type AmountInput = { number: string; currency: string };

type PostingInput = {
  units: AmountInput;
  account: string;
  price?: AmountInput;
  flag?: string;
};

type TransactionInput = {
  date: string;
  flag: string;
  payee?: string;
  narration?: string;
  postings: PostingInput[];
  tags?: string[];
  links?: string[];
  meta?: Record<string, string>;
};

type CommodityInput = { date: string; currency: string };

type PriceInput = {
  date: string;
  currency: string;
  amount: AmountInput;
};

type NoteInput = { date: string; content: string; account: string };

type BalanceInput = {
  date: string;
  account: string;
  amount: AmountInput;
};

type OpenInput = { date: string; account: string; currencies: string[] };

type CloseInput = { date: string; account: string };

type DocumentInput = {
  date: string;
  account: string;
  filename: string;
  tags?: string[];
  links?: string[];
};

type EventInput = {
  date: string;
  type: string;
  description: string;
};

type BudgetInput = {
  date: string;
  account: string;
  interval: string;
  amount: AmountInput;
};

/**
 * One value of a custom directive, tagged the way the bulk-entries contract
 * tags it (`kind`), which is NOT how the engine tags its own values (`type`).
 * The vocabularies differ too: the wire's `text` is beancount's quoted
 * `string`, and its `amount` carries `number`/`currency` as siblings where the
 * engine nests them under `value`. See `CustomDirectiveCreate` in
 * `idl/beancount-ledger.openapi.json`.
 */
export type CustomValueInput =
  | { kind: "account"; value: string }
  | { kind: "text"; value: string }
  | { kind: "number"; value: string | number }
  | { kind: "amount"; number: string | number; currency: string };

/**
 * A `custom` directive. This is how a budget reaches the bulk endpoint: the
 * contract has no `budget` entry type, so callers send
 * `custom` with `type: "budget"` and account/interval/amount as values.
 */
type CustomInput = {
  date: string;
  type: string;
  values?: CustomValueInput[];
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
  | { type: "custom"; entry: CustomInput }
  | { type: "budget"; entry: BudgetInput }
  | { type: "document"; entry: DocumentInput }
  | { type: "event"; entry: EventInput };
