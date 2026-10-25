# PulseMCP intake and registry-ingestion follow-through

At **2026-10-25T07:34:40Z**, the actual
[official submission page](https://www.pulsemcp.com/submit) still pauses new
server/client submissions and changes to existing listings. Its notice is
dated2026-09-03, with no promised reopening date. The supported interim step
is publishing to the Official MCP Registry; PulseMCP says it will pick records
up automatically when back.

That prerequisite is already satisfied: the
[canonical registry record](https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest)
returns active/latest**1.0.0**, `io.beancount/beancount`, with canonical
Streamable HTTP endpoint `https://beancount.io/api-gateway/mcp`.

The actual complete [name query](https://www.pulsemcp.com/servers?q=beancount)
shows1–1of1: another author's Beanquery server. No canonical hosted match is
observed in that result. PulseMCP's official mcp-servers repository describes
its own maintained implementations; it does not establish an external catalog
PR intake. No speculative PR, issue, message or duplicate registry publication
is sent. [Exact current observation](./intake-recheck-20261025.json) retains
the scope of the search and the distinction from publication.

**Next:** PulseMCP resumes ingestion/imports the active registry listing or
opens a supported intake/correction route. The worker verifies actual public
metadata and the advertised authenticated native path before closing w6/042.
Next manual review2026-11-01UTC, or earlier real reopening/publication. No
user action, login, fee approval, new credential or recurring polling job is
needed now. No direct submission to PulseMCP or live listing is claimed.
