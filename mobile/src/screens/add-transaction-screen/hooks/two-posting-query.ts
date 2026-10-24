import { toExactPayeeFilter } from "../../transactions-screen/utils/plain-search-filter";
import { DirectiveType } from "../../transactions-screen/types";

/**
 * The journal query behind a payee's usual accounts. The payee goes out as a
 * quoted filter string: raw, the server parsed it as filter syntax and
 * refused `Dupar's`, `Mr. Marcel` or `Chase:Slate`, so their accounts were
 * never seeded (w21/149). The filter is the payee field matched whole, over
 * transactions: as free text it took the newest 50 entries that merely
 * contained the name ("Uber" among "Uber Eats"), and the payee's own were never
 * read (w21/921). Callers still exact-match the payee client-side.
 */
export function twoPostingSuggestionsQuery(payee: string) {
  return {
    filter: toExactPayeeFilter(payee),
    directiveTypes: [DirectiveType.TRANSACTION],
    limit: 50,
  };
}
