# Official Docker Gateway native rehearsal — 2026-10-24 UTC

The actual official Gateway v0.44.1 authenticates to the canonical hosted
endpoint with only `ledger.read ledger.write` and one explicitly selected
synthetic QA ledger. Its real loopback callback and code exchange complete.
The previously digest-verified executable and existing Docker 29.8.2 engine
are reused, with a uniquely named local catalog/profile; no additional backend
stack or global plugin installation is used.

The unmodified Gateway runs over stdio. An existing MCP SDK client drives its
real discovery, resources and tools; all accounting calls go through that
Gateway, not a direct REST substitute. It exposes 44 service tools plus eight
Gateway management tools, eight resources and 64 resource templates. Only the
selected Beancount ledger's accounting tools/resources are exercised.

The actual journey runs from 2026-10-24T01:03:57.696Z to 01:04:04.596Z:

- `checkLedger`, the main-file resource and a structured Cash BQL query establish
  the before state. Cash is 49.75 USD and validation errors are empty.
- Exactly one observed `appendLedgerText` call targets `main.bean`, with a balanced
  synthetic Coffee/Cash transaction, `dry_run: true` and `allowInvalid: false`.
- The response reports `dry_run: true`, `wrote: []`, one proposed directive and
  zero new validation errors.
- Repeated native checks show the same ledger commit and entry counts, no
  errors, the identical main-file SHA-256 and Cash still 49.75 USD. The unique
  preview payee is absent before and after.

The target-file hash is
`77c3a591efd311e01d03d2f3a91f2919151c0fb0708e1abe1a10ce6ec7e29915`.
This is actual unchanged-state proof for the observed window and target file,
not a claim about later concurrent QA or uninspected client interfaces. Raw
native responses and the driver are retained only under ignored
`backend-cluster/backend-v2/tmp/w6-docker-native-20261024/`.

## Native tooling limits

On this macOS host, `oauth authorize` exchanges the code and stores the new
collision-resistant credential, then exits 1 when erasing an absent legacy
keychain item. The direct official Gateway retrieves the new OAuth credential
and the entire journey above succeeds. The command's nonzero exit is retained;
it is not reported as a clean command or hidden by fake keychain entries.

`oauth ls` needs an unavailable Docker Desktop tools socket, and the generic
`tools ls` wrapper returns initialize EOF. Neither proves discovery or failure
of the successfully tested direct Gateway. Docker Desktop GUI behavior is not
claimed. The missing optional local secrets engine is also retained in the
private Gateway log; this remote OAuth flow uses its native keychain credential.
The approved grant/local profile are retained; the owned probe process closes
normally after verification.

## Submission validation

Against current upstream main
`49b643ce3fc73e6ee80bb962719b6e2990e3d397`, the actual Go validator, catalog
generator and all Go tests pass. Go is 1.26.4. The existing Prettier 3.8.1 package
runs through task-local links because the parent package's copied `.bin` file
has broken relative resolution; checker logic and project dependency files are
unchanged. The remote validator deliberately skips license-image validation,
which is not a license claim about a generated Docker image.

[PR #6042](https://github.com/docker/mcp-registry/pull/6042) is actually submitted,
open and mergeable, with three new files and 39 additions. Initial upstream
checks are unreported. The private test-credential form has not been submitted;
its checklist item remains visibly unchecked. [Receipt](./submission-receipt.json).
Review, publication and actual public-catalog installation remain separate.
