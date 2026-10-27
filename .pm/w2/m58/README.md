# w2 · m58 — Import payment-processor payouts as gross, fees, tax, and net

**Worker:** worker2 **Goal:** `beancount-import` reads a Stripe- or Shopify-style payout export into entries that keep gross sales, processor fees, collected tax, refunds, and the net payout separate, and ties each payout to its bank deposit without double-booking. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the payout reference in the broker-activity pattern | 75m | w2/m55/t001, w2/m56/t002 |
| t002 | Tie each payout to its bank deposit without double-booking | 45m | t001 |
| t003 | Write evals, fixtures, and routing entries | 45m | t001, t002 |
| t004 | Run the evals and routing set on both clients | 45m | t003 |
| t005 | Adoption surface | 30m | t004 |
| t006 | Simplify | 15m | t005 |
| t007 | Test coverage | 45m | t005, t006 |
| t008 | Closeout | 15m | t007 |

## Definition of done

- Each payout is written only when the export's own figures tie (gross minus fees minus refunds, with tax as stated, equals net); a mismatch or an unmapped row type stops with the figures shown.
- Payouts land in a processor clearing account, and the bank deposit matches as a transfer the user confirms, so revenue is booked once and settled payouts leave the clearing account at zero.
- Charges that settle open invoices apply through m56's payment procedure; an exact re-import adds zero entries.
- Evals pass on Claude Code and Codex.

## Source + Goal linkage

- **Source:** small-business owner review of the skill suite (five-person services LLC: client invoices, contractors, a payroll provider, quarterly tax remittances), triaged 2026-10-21 — item 6 (the payout half), and the invoicing paragraph's point that net-of-fee deposits silently merge revenue and fees. Verified on `main`: import has no payout procedure; `skills/beancount-import/references/broker-activity.md` is the mapper pattern the review suggests reusing.
- **Goal linkage:** **A1 — Agent-native accounting:** gross revenue and processor fees stay separate without hand-splitting every payout.
- **Expected outcome:** a business that sells through a processor gets correct revenue and fee totals from one import per period. Signals: eval pass rate on both clients; import invocations naming payout exports.
- **Why now:** after [m56](../blocked/m56/README.md), whose payment procedure applies settled charges to invoices. Inventory, the review's other item-6 half, is parked in [w2/099](../blocked/099.md). Adoption surface is included because import's customer surface changes.
