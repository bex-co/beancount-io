# w23 · m32 — Make the MCP endpoint answer every HTTP verb and header consistently

**Worker:** worker1 **Goal:** Each HTTP verb and request header on the MCP endpoint gets one documented, tested answer, and the unauthenticated ones are probed by `yarn mcp:conformance`. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Answer OPTIONS and every non-POST verb with Allow: POST | 25m | — |
| t002 | Tabulate current versus specified behavior for the remaining probes | 30m | — |
| t003 | Fix each gap with a regression test | 60m | t002 |
| t004 | Add the credential-free probes to yarn mcp:conformance | 30m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

`OPTIONS`, `PUT` and every other non-POST verb answer with `Allow: POST`; a probe table for `Accept`, `Content-Type`, `MCP-Protocol-Version`, malformed JSON and browser preflight exists with a test per row; the behavior is written in `docs/mcp.md`; `yarn mcp:conformance` runs the credential-free rows; `yarn test` passes.

## Source + Goal linkage

- **Source:** [w23/229](../../229.md) (folded in as t001), `/pm-brainstorm for w23` 2026-11-08, proposal 2.
- **Goal linkage:** A1 — Agent-native accounting; A3 — credibility with clients and registries.
- **Expected outcome:** Hand-written clients and registry crawlers get one predictable answer per verb and header, so a probe never advertises what the endpoint refuses.
- **Why now:** w23/229 shows the transport layer has unexamined edges; fixing one verb without the table would leave the next probe to find the rest.
- **Adoption surface:** included: agents and integrators touch this surface directly.
