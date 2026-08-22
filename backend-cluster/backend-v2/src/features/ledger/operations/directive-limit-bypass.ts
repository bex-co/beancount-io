/**
 * Per-request options telling ledger-v2 this write is exempt from the directive
 * limit — see `DirectiveLimitOptions.exempt` there for why mobile is.
 *
 * Sent as a header so it applies to every write endpoint without changing their
 * payloads, and so the generated fava client does not have to be regenerated.
 *
 * This replaced a 45-second Redis ticket, removed 2026-08-20 together with the
 * pre-receive hook (w1/m17 t014). The ticket existed because a write was checked
 * twice — by ledger-v2, then again by the hook after Gitea processed the commit
 * — so the fact had to outlive the first read. With one check left, the caller
 * can simply say so.
 *
 * It was also blunter than intended, and production proved it: keyed by ledger
 * owner, it exempted *any* write to that ledger for 45 seconds — including a
 * concurrent `git push` that had nothing to do with mobile. That is gone now
 * too; the header exempts exactly the request that carries it.
 */
export function directiveLimitExemptParams(platform: "web" | "mobile") {
  return platform === "mobile"
    ? { headers: { "x-directive-limit-exempt": "1" } }
    : {};
}
