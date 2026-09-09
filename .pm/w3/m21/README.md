# w3 · m21 — Continue profile social lists beyond the first page

**Worker:** worker3 **Goal:** profile visitors can reach every available page of
Followers, Following and Starred lists **Status:** todo

## Tasks (in order)

| id   | title                                             | est | depends_on |
| ---- | ------------------------------------------------- | --- | ---------- |
| t001 | Add continuation state to the Followers read      | 40m | —          |
| t002 | Apply continuation to Following and Starred reads | 45m | t001       |
| t003 | Expose accessible continuation in the social tabs | 35m | t001, t002 |
| t004 | Adoption surface for complete profile lists       | 20m | t003       |
| t005 | Simplify the profile pagination changes           | 20m | t004       |
| t006 | Test profile pagination and request isolation     | 45m | t004, t005 |
| t007 | Close out and archive complete profile pagination | 15m | t006       |

Three implementation tasks total 120 minutes; 220 minutes including closing
work. The complete repair exceeds the sub-hour inbox threshold. All code work
belongs to dashboard; backend contracts remain unchanged.

## Reproduced finding

**Severity: minor.** Public-profile discovery silently stops before the end of
the Followers list. Production `https://beancount.io`, 2026-09-08, Chrome 152,
English, System/light, authenticated QA account viewing public `open_ledger`.
Fresh desktop 1440×1000 and narrow 390×844. Local HEAD `a315c273`, fetched main
`cc3f4c2f`; implicated dashboard code unchanged there. Deployed SHA unverified.

1. Open `/ledger/open_ledger?tab=followers`, or choose **Followers (38)** from
   the public profile's tabs.
2. After loading, the panel contains exactly **20 user-card links**. Scroll to
   its final card: there is no Next/Show more control, and scrolling requests
   no second page. The panel has zero buttons or pagination controls.
3. Fresh desktop/narrow repeats issue only `GetUserFollowers` with
   `{username: "open_ledger", page: 1, limit: 20}`. The response is HTTP 200,
   with twenty users and `total: 20`, while the profile tab retains 38.
4. Independent read-only GraphQL and REST controls establish the omitted data:

   | request                             | users returned | total field | status |
   | ----------------------------------- | -------------: | ----------: | ------ |
   | page 1, limit 20                    |             20 |          20 | 200    |
   | page 2, limit 20                    |             18 |          18 | 200    |
   | page 3, limit 20                    |              0 |           0 | 200    |
   | page 1, limit 100 (GraphQL control) |             38 |          38 | 200    |

   The first two pages have zero overlapping identities and their ordered
   union equals the 38-item control. Comparisons ran in memory; no follower
   usernames, profiles, biographies or avatar URLs were retained as evidence.

Expected: the profile offers a way to request and reach the remaining eighteen
followers and stops when the returned pages are exhausted. Increasing a fixed
limit would merely move the cutoff to a larger profile.

## Root cause and contract

`dashboard/src/features/user-profile/hooks/use-user-followers.ts:4–15` always
requests page one at limit twenty and exposes no continuation action.
`user-profile-tabs.tsx:67–78` consumes the three lists, then its Followers branch
at lines 150–177 maps only the returned users. The sole caller of each social
hook is this tab component. `use-user-following.ts` and
`use-user-starred-repos.ts` contain the same fixed-page pattern; their respective
tab branches also have no continuation. They belong in the same scoped repair,
but production lists above twenty were demonstrated only for Followers.

The changing `total` is **intentional**, not a new API bug. Backend
`src/features/gitea/user-profile/api/social-read-routes.ts:68–69` explicitly
documents it as the returned page size and preserves the existing successful
empty-page fallback on upstream failure. The service at
`user-profile/service/user-profile-service.ts:340–425` implements that shape;
`api/__tests__/social-list-parity.test.ts:143–174` tests it across adapters.
Do not redefine total, invent new backend pagination metadata or weaken the
existing parity baseline to fix this dashboard omission.

The observed REST counterpart is
`GET /api-gateway/v1/social/followers?username=open_ledger&page=2&limit=20`.
GraphQL, REST and MCP's source-traced `SOCIAL_READS` registration share this
service. Live MCP was not exercised. The matching REST page results establish
that the existing backend already supplies the missing users.

Use per-list continuation with explicit loading/retry state, append only the
requested page, and deduplicate by the existing user/repository identity. Stop
after a short page under this contract; handle an exact page multiple with the
subsequent empty page. Keep list state isolated when the profile username
changes and reject late results from a previous target. Preserve lazy tab
fetching, tab URL state and existing public/permission boundaries.

## Working controls and limits

- The same profile's Ledgers collection supports keyboard Show more:
  **12 → 24 → 36 → 43**, then hides the continuation control. At both widths,
  searching `  CRYPTO  ` finds the one crypto-example ledger outside the initial
  twelve; keyboard Clear restores twelve items and search focus.
- At 390px, Following correctly returns/renders one user and Starred returns
  zero repositories with **No starred repositories**. Those small/empty states
  are controls, not proof that their unexercised larger lists are complete.
- Both Followers repeats have no page exceptions or GraphQL errors. They do
  produce separate mixed-content avatar warnings; the narrow repeat also logs
  image CORS/loopback failures. These do not prevent the twenty successful
  user cards from rendering and are not the cause of the absent page request.
  Avatar delivery is outside this milestone and remains a separate candidate.
- Private profiles, live large Following/Starred lists, client/network failure
  injection, stale-request races, other locales/browsers and a patched
  implementation remain unverified. Test those lifecycle cases locally without
  creating production follows/stars or recording people’s profiles.

## Definition of done

- [ ] The public Followers journey reaches all 38 available cards through
      named keyboard/pointer continuation controls at desktop/narrow widths,
      without duplicates or an unnecessary continuation after the final page.
- [ ] The observed Following-one, Starred-empty and Ledgers 12/24/36/43/search
      controls remain correct. Local synthetic multi-page Following/Starred
      fixtures exercise the source-traced affected branches.
- [ ] Local hook/tab integration tests prove single-flight continuation,
      retries, exact/short/empty pages and username changes during a pending
      request; no old-profile result enters the active list.
- [ ] Loading and final-page transitions retain usable keyboard focus and
      truthful visible status. Actual client/network errors preserve loaded
      cards and an actionable retry; the API's legacy fallback is unchanged.
- [ ] Dashboard format, lint, tests and build pass, and the public read-only
      reproduction is repeated. No backend/API, social mutation or permission
      changes are part of the repair.

## Source + Goal linkage

- **Source:** repeated `$qa-find-bugs-dashboard w3`, public-profile journey,
  2026-09-08. This is one grouped list-continuation finding.
- **Goal linkage:** A3 — Community & distribution, with A2 discovery support.
  Visitors can explore the complete public community and starred-ledger lists
  offered by the profile instead of being limited to the first twenty cards.
- **Expected outcome:** a visitor reaches the remaining eighteen followers in
  the reproduced profile and can continue other paginated social lists through
  the same clear controls.
- **Why now:** the backend already provides subsequent pages, while the
  dashboard exposes a larger count with no way to reach the remaining people.
  Fix the client without a new API or authentication project.
- **Adoption surface:** included because people use these public discovery
  controls and their localized labels directly.
- **Dedupe:** searched open/completed board records for social/profile paging
  and reviewed open milestone summaries. Completed w1/m10/t021 preserves the
  existing pagination contract; it does not implement dashboard continuation.
  Completed w4/m4 implements mobile discovery with different hooks and does
  not fix these dashboard tabs. History traces the fixed-page hooks to
  `af5339de`; `5855c32a` added the working Ledgers collection without adding
  social-list continuation. No later main repair exists.

Ignored evidence in `dashboard/tmp/qa-20260907-w3-loop/`:
`profile-social-pagination-evidence.json`, `profile-followers-count-1440.png`,
and `profile-followers-count-390.png`. The PNGs crop only the public tab/count,
excluding follower identities. No social relationship or ledger data changed;
the profile was returned to its Ledgers tab with empty search.
