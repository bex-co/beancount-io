/**
 * The one `filter` description every journal surface publishes (w23/m2/t004):
 * the MCP `listLedgerEntries` tool, the REST journal reads (and the MCP
 * journal resources that twin them), and the GraphQL journal inputs.
 *
 * Every form named here is proven by the ledger evaluator's own tests
 * (`directive-filter.test.ts`, including the golden Fava-parity cases) and
 * every surface passes the string through untouched (journal-parity.test.ts).
 */
export const JOURNAL_FILTER_DESCRIPTION =
  "Fava advanced-filter expression. `#tag` and `^link` match exactly; bare or " +
  '"quoted" words match narration/payee (transactions) or comment (notes); ' +
  "`field:value` looks up `account` (posting accounts included), `tag`, `link`, " +
  "`payee`, `narration`, `date`, or entry metadata; `field>100` compares amounts " +
  "and bare `>100` matches posting units; `any(...)`/`all(...)` scope a test to " +
  "postings; `-` negates, `,` is OR, juxtaposition is AND, parentheses group. " +
  'Quote values holding a colon or space — `account:"Assets:Bank:Checking"` — ' +
  "there are no escape sequences.";
