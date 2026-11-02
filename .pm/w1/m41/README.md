# w1 · m41 — Saving a file answers as soon as the write lands

**Worker:** worker1
**Goal:** Saving a file in the dashboard editor confirms success when `UpdateLedgerFile` returns. It no longer waits for the ledger to be revalidated, and it stops moving the whole file over the wire two extra times per save.
**Status:** todo (t001–t003, t005, t006 done)

## Tasks (in order)

| id   | title                                                                 | est | depends_on |
| ---- | --------------------------------------------------------------------- | --- | ---------- |
| t001 | Confirm the save on the write; check for new errors in the background — **DONE** | 45m | —          |
| t002 | Stop selecting the file `content` in the `UpdateLedgerFile` result     — **DONE** | 20m | —          |
| t003 | Replace the post-save full cache wipe with targeted invalidation       — **DONE** | 45m | t002       |
| t004 | Measure save latency on the hosted dashboard before and after         | 30m | t001, t003, t007 |
| t005 | Adoption surface                                                      — **DONE** | 15m | t003       |
| t006 | Simplify                                                              — **DONE** | 20m | t005       |
| t007 | Test coverage                                                         | 40m | t005       |
| t008 | Closeout                                                              | 10m | t004, t006, t007 |

Re-sequenced 2026-11-02: production verification (t004) moved after Test coverage (t007). Adoption surface, Simplify and Test coverage need no deploy, and verifying last means t004 measures the revision that closes the milestone.

## Definition of done

- On a ledger whose `main.bean` is about 300KB, "File saved successfully" appears once `UpdateLedgerFile` returns. The serial `GetLedgerErrors` round trip no longer happens before it, as a browser network log shows.
- A save that introduces a new ledger error still shows the "write left errors" warning with its link to Errors, after the success message.
- The `UpdateLedgerFile` response carries no file `content`. After a save, the page does not evict `ROOT_QUERY`: only queries that the write invalidates refetch, and the file view shows the saved content and sha.
- t004 records before and after timings from the hosted dashboard.

## Source + Goal linkage

- **Source:** user report on 2026-11-02 that saving `main.bean` takes 5–10s. The browser investigation the same day measured saves on a 312KB `main.bean` at about 2s to the success toast: `UpdateLedgerFile` took 1.2–1.7s, then a serial `GetLedgerErrors` 0.6–0.8s, then about 10 refetches after `cleanCache()` 0.5s. No main-thread long tasks were recorded. The 5–10s did not reproduce. The working hypothesis is that serial round trips and whole-file transfers (one upload, the file returned in the mutation result, one more download from the refetch) are amplified by slower networks and cold revalidation.
- **Goal linkage:** **A2 — Frictionless onboarding.** Editing the ledger file directly is the fastest way for a newcomer to fix their books. A save that hangs for seconds makes the product feel broken at exactly that moment.
- **Expected outcome:** saves confirm in about the `UpdateLedgerFile` time, saving roughly 0.7s per save at current measurements and more on slow links. Each save moves about one file's worth of data instead of three.
- **Why now:** this is a user-reported regression feel on the most common editing path. The fix is local to the dashboard and needs no backend change.
- **Adoption surface:** included, because the save confirmation and the error warning are customer-facing.
