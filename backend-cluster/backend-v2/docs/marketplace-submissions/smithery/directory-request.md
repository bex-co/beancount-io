# Smithery direct-directory request — draft, not sent

**To:** [ani@smithery.ai](mailto:ani@smithery.ai), the contact in the
[official transition notice](https://smithery.ai/future).

**Subject:** Beancount.io direct MCP directory inclusion after October 31

Hi Anirudh,

We would like to include Beancount.io in Smithery's retained direct-URL MCP
directory. The existing URL-publishing flow returned “Updating servers has
been removed.” Could you confirm the supported submission/claim route, or
consider this entry for curated inclusion?

- Name: Beancount.io
- Registry identity: `io.beancount/beancount`
- Description: Query, edit, and reconcile a hosted Beancount ledger with BQL,
  reports, files, and bank imports.
- Direct endpoint: https://beancount.io/api-gateway/mcp
- Transport: Streamable HTTP
- Authentication: OAuth; sign in and approve ledger-specific permissions.
- Source: https://github.com/bex-co/beancount-io/tree/main/backend-cluster/backend-v2
- Setup: https://github.com/bex-co/beancount-io/blob/main/backend-cluster/backend-v2/docs/mcp.md
- Active official registry record: https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest

The service is already hosted at the direct endpoint above and does not need
a Smithery proxy deployment. Please let us know the ownership-verification
steps for the retained directory.

Thank you,
Beancount.io

---

Only public service metadata is included. No QA credentials, account password,
ledger contents, billing commitment or agreement acceptance is part of this
draft. Sending is a separate action that requires the publisher's explicit
authorization. This file does not establish a sent request or submission.
