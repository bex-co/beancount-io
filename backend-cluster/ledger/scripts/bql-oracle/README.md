# BQL oracle corpus

`yarn verify:rustledger` replays the BQL queries in `queries.json` through `LedgerShellService.queryShell` — the service the REST, GraphQL and MCP query tools share — and compares each answer with what **stock beanquery 0.2.0** returns. A change that makes the engine refuse or reword a query stock accepts turns the gate red.

| File | Role |
| --- | --- |
| `queries.json` | The query list: `id`, `ledger` (a file under `fixtures/`), `source` (the note that motivated it), `query`. |
| `fixtures/*.bean` | The ledgers the queries run on. |
| `bql-oracle.json` | Stock beanquery's answers, generated and checked in. |
| `allowlist.json` | The documented differences the gate tolerates. |
| `generate-bql-oracle.py` | Regenerates `bql-oracle.json`. |
| `bql-oracle-compare.ts` | The pure comparison and allowlist logic. |
| `replay-bql-oracle.ts` | The replay, called from `scripts/verify-rustledger.ts`. |

## Offline by design

Stock beanquery reads a local ledger loaded by `beancount.loader` and has no data source of its own. The managed price feed (`include "https://beancount.io/prices/..."`) is resolved by the `bea` CLI outside beanquery, so it never reaches the oracle. Keep it that way:

- Fixtures use literal `price` directives only. Never `include` a remote URL.
- The generator refuses a fixture that does not load cleanly, so a vacuous result cannot be recorded.
- The output holds no timestamps and no absolute paths (the fixture directory is stripped from `meta` cells), so it is byte-identical on every machine.

## Regenerate the oracle

Run from `backend-cluster/ledger`, with `beanquery` 0.2.0 and `beancount` 3 installed. The CLI environment has both:

```sh
(cd ../../cli && uv sync --all-groups)
../../cli/.venv/bin/python scripts/bql-oracle/generate-bql-oracle.py
```

Commit `bql-oracle.json` with the `queries.json` or fixture change that required it. The file records a hash of both inputs in `sourceHash`, and the replay recomputes it in Node (CI runs no Python), so a query or fixture edited without regenerating fails `yarn verify:rustledger` with the command above. Any byte of `queries.json` or a fixture counts, including whitespace.

## Add a query

1. Append `{ "id", "ledger", "source", "query" }` to `queries.json`. The `id` is unique and kebab-case; `source` names the note or finding, for example `w23/212`.
2. Regenerate the oracle and run `yarn verify:rustledger`.
3. If the engine and stock differ, either fix the engine or add an allowlist entry (next section).

## What is compared

A query is compared on five axes, so an entry can excuse exactly the difference it documents:

| Kind | Meaning |
| --- | --- |
| `outcome` | One side refused the query and the other answered it. Two refusals always agree: stock's exception class and the engine's wording are not compared. |
| `columns` | Different column names or a different column count. |
| `dtype` | A column carries a different type name. |
| `row-count` | A different number of rows. |
| `cells` | A different value in a row both sides returned. |

Representation differences that carry no meaning are removed before comparing cells: an Amount is a pair in stock and a one-entry map in the engine, an Inventory is a list in stock and a map in the engine, a set is a list in stock and the double-space-joined string stock prints, and a number is a number or its decimal text.

## The allowlist

An entry in `allowlist.json` excuses one query for the listed kinds:

```json
{
  "id": "concat-literals",
  "differences": ["outcome"],
  "references": [".pm/w23/done/154.md"],
  "note": "The engine adds numbers only; the refusal names the no-concat limitation."
}
```

The replay refuses the file when an entry:

- names a query the oracle does not contain, or lists a query twice;
- has no `references`, or one that does not resolve to a file in this repository (a `.pm` note, an ADR, a blocked item);
- lists a kind the query no longer shows. A deviation that has been fixed must leave the list in the same change, so the list cannot rot.

A kind that is not listed still fails: an entry for `dtype` does not excuse a new `cells` difference on the same query.

Deviations fall into four groups. Tell them apart before adding one:

- **Deliberate refusals.** The engine cannot reproduce stock and says so, usually naming the accepted spelling (`str()` inputs, string `+`, date arithmetic, `neg`/`filter_currency` signatures, quoted identifiers outside `FROM`, text after `;`).
- **Deliberate divergences.** `FROM accounts` resolves table-first.
- **Upstream engine gaps** tracked on a blocked item: `FROM <column> > …` predicates (`w6/blocked/023`) and the synthetic opening balances of `OPEN ON` (`w6/blocked/022`).
- **Superset behavior.** The engine accepts what stock 0.2.0 refuses (window functions, a `cost` column, `FROM balances`).

Open deviations that nobody has decided yet have their own inbox note, for example `w23/215` and `w23/216`; their entries come out when the note ships.

## Limits

The oracle is stock beanquery **0.2.0**. A behavior newer stock versions add (for example `account_balance`) shows up here as a superset entry rather than a match. Regenerating on a newer beanquery is a deliberate change: update `ENGINE_BEANQUERY` in the generator, regenerate, and review every changed answer.
