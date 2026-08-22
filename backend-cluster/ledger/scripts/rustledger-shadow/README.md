# Rustledger endpoint shadow corpus

This release gate replays 34 accounting endpoint requests against a checked-in,
multi-file ledger with custom account roots. `python-oracle.json` was captured
from the real FastAPI service at the recorded pre-deletion commit; the verifier
runs the current Rustledger-backed services with the same request matrix and
fails on any unexpected response change.

Run the gate from `backend-cluster/backend-v2`:

```sh
yarn verify:rustledger:shadow
```

`backend-cluster/beancount-ledger` was deleted from the working tree at the
ledger-v2 decommission (`docs/ledger-v2-cutover-runbook.md`) — regeneration
now requires checking out a pre-deletion commit into another worktree:

```sh
OLD_LEDGER_ROOT=/path/to/old/backend-cluster/beancount-ledger
"$OLD_LEDGER_ROOT/.venv/bin/python" \
  scripts/rustledger-shadow/generate-python-oracle.py \
  --oracle-root "$OLD_LEDGER_ROOT" \
  --fixture-root scripts/rustledger-shadow/fixtures \
  --output scripts/rustledger-shadow/python-oracle.json
```

The comparison permits only these documented, intentional representation
differences:

- Decimal strings are compared after removing insignificant trailing zeroes
  (`25.50` and `25.5` are the same exact amount). Rustledger uses BigNumber's
  canonical decimal rendering.
- Fava emitted `cost: null` and `cost_children: null` on report tree nodes;
  GraphQL omits those optional null fields. The populated cost fields are still
  compared normally. Empty optional metadata objects are treated the same way.
- Journal source `meta.filename`/`meta.lineno` is absent because Rustledger's
  directive wire type does not expose parser locations. Entry IDs use the
  golden-verified meta-free Beancount content hash, so IDs are stable in the new
  service but are intentionally not equal to Fava's location-dependent hashes.
- The account-detail endpoint has the same source-location/hash limitation;
  account names, close dates, last-entry dates, and all other fields still
  compare normally.

Everything else—including dates, accounts, time-clamped balances, hierarchy
shape, source-file closure, journal membership, BQL tables/text, and exact
numeric values—must match the Python endpoint payload.
