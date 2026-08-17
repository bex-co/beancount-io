# w1 · m3 — Drag-to-resize left sidebar

**Worker:** worker1 **Goal:** the dashboard's left nav can be resized by dragging its edge, and the chosen width persists across reloads without an SSR flash **Status:** done

## Tasks (in order)

| id   | title                                                              | est | depends_on | status        |
| ---- | ------------------------------------------------------------------ | --- | ---------- | ------------- |
| t001 | Add width state + min/default/max constants to `SidebarProvider`   | 40m | —          | — **DONE**    |
| t002 | Persist sidebar width via SSR-safe cookie; fix open-state read     | 40m | t001       | — **DONE**    |
| t003 | Turn `SidebarRail` into a pointer-event drag-to-resize handle      | 1h  | t001       | — **DONE**    |
| t004 | Render `<SidebarRail />` in `LedgerSidebar` and `DashboardSidebar` | 20m | t003       | — **DONE**    |
| t005 | Simplify the changed sidebar code                                  | 20m | t004       | — **DONE**    |
| t006 | Tests for width persistence + drag-resize behavior                 | 40m | t004       | — **DONE**    |
| t007 | Closeout                                                           | 10m | t006       | — **DONE**    |

## Definition of done

- Dragging the sidebar's right edge resizes it live, clamped to a min/max width, with no per-frame React re-render during the drag (width driven through the `--sidebar-width` CSS variable).
- The chosen width survives a full page reload and renders correctly on first paint (SSR reads the cookie — no width flash).
- The existing `sidebar_state` open/collapsed cookie is actually read back on load (today it is written but never read, so collapse does not persist).
- Both the ledger app layout and the dashboard-list landing layout get the resize handle.
- Double-click / keyboard toggle behavior on the rail is preserved.

## Source + Goal linkage

- **Source:** `/pm` invocation on 2026-08-16 capturing a sidebar-resize research spike; technique is a hand-rolled pointer-event drag handle on the existing shadcn `SidebarRail`, persisted via the repo's `useCookieStorageState` hook.
- **Goal linkage:** A2 — frictionless onboarding. A resizable, persistent nav lets newcomers evaluating the dashboard fit dense account trees / long ledger names on small or large screens without fighting a fixed 16rem rail; small friction removed from the first-run workspace.
- **Expected outcome:** a user (or agent driving the web app) can widen/narrow the nav to taste and have it stick — a more comfortable default workspace for anyone trying Beancount.io in the browser.
- **Why now:** the app already ships the unused shadcn `SidebarRail` and the `--sidebar-width` var plumbing, so the marginal cost is low; it also fixes a latent bug where the open/collapsed cookie never persists. Adoption linkage is polish-tier (A2), not a headline lever — kept scoped to one milestone accordingly.
- **Adoption-surface task omitted:** this is in-app UX with no install step, quickstart, skill, or package surface to update; nothing in a README/`CLAUDE.md`/skills table changes. Per the standing-task rule, the Adoption surface task is skipped and noted here.
