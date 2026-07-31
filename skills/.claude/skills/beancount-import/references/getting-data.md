# Getting export files — no scraping, ever

This skill consumes files the user already has. It never logs into a bank, drives a browser, or stores credentials. Two supported acquisition paths:

## 1. Manual export (default)

Every US/CA bank and card portal exports CSV and most export OFX/QFX ("Quicken format" — parse as OFX):

- Prefer **OFX/QFX over CSV** when offered: it carries `FITID`, the strongest dedup ID (see dedup.md).
- Export a **bounded, slightly overlapping window** (e.g. last 60 days, monthly). Overlap is safe — dedup makes re-imported rows no-ops; gaps are the real risk. `beancount-reconcile`'s balance assertions are the backstop that catches a gap.
- Brokerage note: cash-account exports import fine here; **trade confirmations do not** — route trades to `beancount-options` (and decline to import buy/sell rows of securities: cost-basis booking is out of this skill's scope).

## 2. SimpleFIN Bridge (for users who want a feed)

[SimpleFIN Bridge](https://beta-bridge.simplefin.org/) (~$1.50/month) is a **read-only** aggregation relay: the user connects institutions on the SimpleFIN side and gets an access URL that returns accounts + transactions as JSON over plain HTTPS — no bank credentials on this machine, revocable server-side, no write ability by design.

- Treat the JSON as just another source format: each transaction has `id` (→ `import-id: "simplefin:<id>"`), `posted` (unix timestamp → date), `amount` (signed string), `description`, and a `pending` flag — normalize into the standard staged-row shape and continue the normal pipeline (dedup → suggest → confirm).
- The access URL is a **secret**: keep it out of the ledger, the config block, and anything committed. If the user pastes it, use it for the fetch and remind them it doesn't belong in the repo.
- Curl is enough: `curl -s "<access-url>/accounts?start-date=<unix>"`.

## Explicitly unsupported

- Screen-scraping bank websites or driving a logged-in browser session — brittle, ToS-hostile, and a credential risk. If the user asks, explain and point at the two paths above.
- Storing bank credentials or aggregator tokens anywhere in the ledger repo.
