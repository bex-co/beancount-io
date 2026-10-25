# w5 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [x] **m1** — Ledger sidebar: richer rows, honest states, post-create landing (9 tasks) ← from /pm-brainstorm 2026-08-17
- [x] **m2** — Accessibility pass on /ledger + gallery (8 tasks) ← from /pm-brainstorm 2026-08-17 — sequenced after m1 (both touch `LedgerItem`)

- [x] **m3** — [Install and verify the eight customer ledger skills](./done/m3/README.md) (8 tasks) ← approved `/pm-brainstorm for w5`; materialized 2026-09-12
- [x] **m4** — [Make real MCP agent journeys reproducible](./done/m4/README.md) (9 tasks) — rescoped 2026-09-15 to the hosted MCP endpoint ← promoted core scope of [w2/009](../w2/blocked/009.md); user routed to w5 on 2026-09-12
- [ ] **m5** — [Verify and complete shipped MCP accounting prompts](./blocked/m5/README.md) (9 tasks) — **blocked:** t001–t008 done and Codex measured ([w4/960](../w4/done/960.md)); the closeout needs `d812112f6` deployed and seen live ← approved w5 proposal; reconciled with shipped [w2/008](../w2/done/008.md) on 2026-09-13 — depends on m4 closeout

- [x] **m6** — [Authenticate live prices and report refresh failures](./done/m6/README.md) (7 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21
- [x] **m7** — [Expose live-price provenance in ordinary reports](./done/m7/README.md) (6 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21
- [x] **m8** — [Validate and release authenticated CLI live prices](./done/m8/README.md) (7 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21

- [x] **m9** — [Complete a first month through the installed ledger skills](./done/m9/README.md) (8 tasks, ~5h) ← `/pm-brainstorm for w5`, all three proposals approved with `$pm all for w5` on 2026-09-27

- [x] **m10** — [Migrate an export and continue importing without duplicate transfers](./done/m10/README.md) (9 tasks, ~6h) ← `/pm-brainstorm for w5`, both proposals approved with `$pm for both to w5` on 2026-09-28

- [x] **m11** — [Publish the CLI fixes required by the migration journey](./done/m11/README.md) (8 tasks, ~5h) ← `/pm-brainstorm more for w5`, all three proposals approved with `$pm all for w5` on 2026-09-28

- [x] **m12** — [Graduate a CSV workflow into a tested, maintainable importer](./done/m12/README.md) (9 tasks, ~6h) ← `/pm-brainstorm for w5`, both proposals approved with `$pm for all for w5` on 2026-09-28

- [ ] **m13** — [Install the ledger skills and reach a first query on native Windows](./blocked/m13/README.md) (8 tasks, ~5½h) ← `/pm-brainstorm for w5`, both proposals approved with `$pm for all for w5` on 2026-09-28 — **blocked:** native Windows host access is required

## Dropped

- ~~**032**~~ — Catalog search `private` filter validated but inert — dropped 2026-10-02: the finding reads an include flag as an only filter. The upstream search takes `private` (include private ledgers the caller can see, on by default) and `is_private` (only private ones) as separate parameters, and the three transcripts — `private=true`, `private=false`, no filter — are each consistent with that. Mapping `private` onto `is_private`, or rejecting it, would break a working parameter. Re-file as a documentation note if the two names prove confusing in practice.
- ~~**044**~~ — Mistyped list cursor returns -32603 with a raw Zod dump — dropped 2026-10-02: a numeric `cursor` or a `tools/call` with no `name` is a malformed protocol envelope that no conforming MCP client sends, and the MCP SDK's dispatcher refuses it before any handler of ours runs. Re-coding it means overriding the SDK's own request validation for every list method, for an input only a hand-written probe produces.
- ~~**049**~~ — Responses without `Origin` carry an empty `Access-Control-Allow-Origin` — dropped 2026-10-02: no caller can observe a difference. A request with no `Origin` is not a cross-origin browser request, an empty allow-origin grants nothing, and non-browser clients ignore the header.
- ~~**050**~~ — PUT/PATCH get the router's plain-text 405 — dropped 2026-10-02: PUT and PATCH are not MCP transport methods and no client sends them; the router's standard 405 is already a correct refusal. The in-band, authenticated 405 that ADR007 D9 asks for covers GET and DELETE, the two methods the transport defines.
- ~~**052**~~ — Missing rename source refused BAD_USER_INPUT, not NOT_FOUND — dropped 2026-10-02: the note records the throw as deliberate and offers "or document the category" as a fix. Its sibling for comparison gets NOT_FOUND only by accident of wording (see [036](./done/036.md)), and the one real question — which code a missing file should carry on the edit and rename paths — is already in [051](./done/051.md).
- ~~**466**~~ — SIGTERM/SIGHUP to `treeify`/`doctor`/`example` leaves the upstream child running — dropped 2026-10-15: duplicates open [437](./437.md), which covers the same `capture_native` gap for `example`, `treeify` and doctor captures, plus cloud `git clone` and `upgrade`; the work stays tracked there.

## Inbox

- [1031 — Include bank identity in OFX account memory](./1031.md) — major CLI gap: banks sharing an account number overwrite each other’s explicit mappings and later payments post to the wrong bank account; native-valid, repeated 2026-10-25.

- [1030 — Resolve decimal IDs copied from transaction listings](./1030.md) — minor CLI lookup gap: small numeric ref/import-id values printed in fixed point require a hidden exponent spelling in Update; integer/date/string controls pass, checked 2026-10-25.

- [1029 — Keep every written include in batch-update diffs](./1029.md) — minor CLI output gap: all split-file edits persist, but apply returns only the last file’s diff; preview and one-file controls pass, checked 2026-10-25.

- [1028 — Preserve decimal markers in batch-update requests](./1028.md) — minor CLI regression: a malformed decimal row aborts every valid update before per-row validation; previous behavior and Add controls pass, checked 2026-10-25.

- [1027 — Reject duplicate batch-update CSV columns](./1027.md) — minor CLI gap: repeated id/account/flag headers silently choose the last cell and apply; unique mappings and JSON-duplicate/unknown-column refusals pass, checked 2026-10-25.

- [1026 — Plan updates from complete multiline headers](./1026.md) — minor CLI gap: tags land inside payee/narration text and narration replacements cannot apply; one-line, flag-only and existing-tag controls pass, checked 2026-10-25.

- [1025 — Preserve multiline strings during account updates](./1025.md) — minor CLI gap: retargeting changes literal memo, narration and posting metadata along with the real posting; plain/prose/flag-only/other-entry controls pass, checked 2026-10-25.

- [965 — Keep query ordering consistent for nullable cost fields](./965.md) — reopened minor CLI gap: dateless Cost comparisons still cycle and source order changes LIMIT 1; original mixed-type and numeric controls pass, rechecked 2026-10-25.

- [1024 — Handle dateless lots in close diagnostics](./1024.md) — minor CLI gap: inferred offsetting lots crash direct close and block a closing-statement refund; dated, empty, force and label controls pass, checked 2026-10-24.

- [1023 — Canonicalize signed zero in imported directive keys](./1023.md) — minor CLI gap: unchanged native zero balance/tolerance conflicts and blocks new rows; numeric note metadata duplicates, while precision/type/Price controls hold, checked 2026-10-24.

- [085 — Preserve every currency in a partially retained pad export](./085.md) — reopened major CLI gap: cutoff export passes check but loses one currency and halves net worth; original padding controls still pass, checked 2026-10-24.

- [1022 — Reject calendar-week dates outside their stated year](./1022.md) — minor CLI gap: impossible week-zero/53 tuples write in the previous or next year, including mixed files; valid calendar/ISO and original ordinal controls pass, checked 2026-10-24.

- [1021 — Make CSV currency recovery hints fit the headers](./1021.md) — minor CLI gap: a suggested `currency=EUR`/`INR` setting reads the existing amount column as a currency; renamed, single-currency and real-column controls pass, checked 2026-10-24.

- [1020 — Preserve native semantics of generated-looking references](./1020.md) — major CLI gap: native aliases matching the hash grammar silently skip corrected amounts and payments from separate custom namespaces; genuine generated-ID controls pass, checked 2026-10-24. Automatic/configured OFX bank/card callers rechecked 2026-10-25.

- [1015 — Preserve types in declared non-transaction metadata](./1015.md) — reopened minor CLI gap: metadata copies that swap booleans and numbers are misclassified as written; full original field/currency/string-metadata and new type controls pass, checked 2026-10-24.

- [943 — Keep numeric importer IDs stable after serialization](./943.md) — reopened major CLI gap: numeric IDs lose their lookup key, include repeats and corrections write again; original and three-policy controls pass, checked 2026-10-24.

- [924 — Refuse explicit currency symbols that contradict CSV row units](./924.md) — reopened major CLI gap: ₿/BTC, ₭/LAK and ៛/KHR are silently booked as USD; original five-symbol and ambiguity controls pass, checked 2026-10-24.

- [929 — Keep snapshot refreshes faithful to the current source](./929.md) — reopened major CLI gap: retired package resources remain active after successful force export and change accounting. Original controls and new package cases checked 2026-10-24.
- [994 — Complete native acquisition-cost inference](./994.md) — reopened major CLI gap: native weights, signed stated/inferred parts, authored total prices, unfinished inference and independent groups break replies or trade identity. Added controls checked 2026-10-24.
- [995 — Resolve inferred posting prices before import decisions](./995.md) — reopened major CLI gap: known weights, repeating/independent price groups and balanced foreign-currency fees skip trades; inferred-zero restatements conflict. Controls checked 2026-10-24.
- [980 — Preserve trade dependencies in same-day bulk ordering](./980.md) — reopened major CLI gap: bookable labeled transfer chains and stated-cost stock splits are refused; partial add omits a required transfer or sale. Original acceptance and nearby controls rechecked 2026-10-24.
- [226 — Keep importer selectors unambiguous](./226.md) — reopened minor CLI gap: a listed NAME#N selector can collide with a declared importer name and choose another account. Preserve exact-name priority; collision and ordinary controls verified 2026-10-24.
- [947 — Keep closed holdings when their converted balance is zero](./947.md) — reopened minor CLI gap: published offsetting cost lots still disappear after their units net to zero. Original currency/zero-price controls pass; gross-lot and genuine-empty cases rechecked 2026-10-24.


























The 27 findings from the MCP QA auth sweep against the hosted endpoint (023–054, less the five under [Dropped](#dropped)) were fixed in `backend-cluster/backend-v2` and closed on 2026-10-02 and 2026-10-03; each note under [`done/`](./done/) records what shipped and in which commit. None has been re-observed against the hosted endpoint yet — the fixes reach it with the next backend deploy.

- [1016 — Preserve omitted price currencies in native importer entries](./1016.md) — minor CLI gap: native-valid `@ 5` / `@@ 10` sources fail before preview when the printer emits a MISSING class token; explicit-currency controls pass.

- [868 — Preserve package resource directories in portable exports](./868.md) — reopened trivial CLI gap: a required empty resource directory disappears from a successful fresh export; direct/helper and original resource controls checked 2026-10-24.

- [1017 — Keep export artifacts outside copied plugin resources](./1017.md) — major CLI gap: a fresh export puts a feed or relocated local include inside a plugin package, changing valid net worth from 1,800 to 1,850 USD; both paths and allocation controls checked 2026-10-24.

- [1018 — Preserve dateless lots in listed-quantity replay](./1018.md) — minor CLI gap: resolving inferred quantities in JSON invents acquisition dates and makes a valid three-trade replay ambiguous; null-number, dated and single-add-reply controls pass.

- [1019 — Preserve one-letter currency token boundaries](./1019.md) — minor CLI gap: costs and account currency lists lose required spacing, blocking writes and producing invalid PRINT exports; token-order, price and normal-format controls pass.

## Blocked inbox

- [431 — `add balance`/`add price`/bare-number adds load the ledger twice for pre-checks](./blocked/431.md) — blocked on a maintainer choice between a pre-commit hook in the shared write validation and plugin-free pre-checks that change refusals.
- [015 — Decide the supported way to give a custom importer a third-party dependency](./blocked/015.md) — blocked on the CLI product owner's choice of the supported environment; the new work does not depend on this decision.

## Execution notes

**Approved sequence:** m12 → m13. m12 completed on 2026-09-29 with both installed-agent journeys on published bea 0.3.1; its guide, independent checkpoints, header repair, and sandbox-cache correction are shipped. m13 is parked until a native Windows host is accessible; all eight tasks depend on that baseline, and live-client acceptance additionally needs both native agents authenticated. Neither milestone changes blocked m5 or 015.

Blocked milestones live under `blocked/` with their reason and unblock condition in a `## Blocked` section; they keep their task IDs and return to `wN/mN/` when work can resume.

As of 2026-09-29, m10, m11, m12 and inbox 019–022 are complete. `beancount-io` 0.3.1 (tag `cli-v0.3.1`) is published to PyPI and Homebrew, and the migration journey passed on it in both clients. m9 and inbox 016–018 are complete. m5 and 015 retain their recorded external unblock conditions. w5 remains a general-purpose adoption queue.

The earlier sequence was m3 → m4 → m5. Real-client MCP journeys run against the hosted endpoint, not a duplicate stack. m3 and m4 have no dependency on each other; m5/t001 depends on m4/t009. The customer skill installation work in m3 builds on w1/m21's completed accounting-engine integration. The larger Plaid sandbox journey remains an explicit deferred follow-up in w2/009. m5 verifies and repairs the four prompts already shipped by w2/008; it does not recreate their registration or bodies.

Authenticated CLI live-price milestones m6 → m7 → m8 completed with CLI 0.3.0 on 2026-09-21. The existing m5 blocker remains independent.
