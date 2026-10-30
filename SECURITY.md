# Security policy

## Supported versions

Security fixes target the following versions:

| Surface | Supported version |
| --- | --- |
| Hosted service at [beancount.io](https://beancount.io/) | Current production deployment |
| `bea` CLI | Latest published stable `cli-v*` release |
| iOS and Android apps | Latest published stable `mobile-v*` release |
| Source builds and self-hosted deployments | Current `main`, with the owning package's supported runtime and dependencies |

See the [releases](https://github.com/bex-co/beancount-io/releases) for published
CLI and mobile versions, and [AGENTS.md](./AGENTS.md#tooling) for runtime
requirements. Reports about older versions are welcome, but maintainers may ask
you to reproduce the issue on a supported version. Backports to older releases
are not guaranteed.

## Report a vulnerability privately

Email **[security@beancount.io](mailto:security@beancount.io)**. This is the
maintainer-confirmed channel for vulnerability reports. Please keep security
reports out of public issues, pull requests, and community chat while the issue
is being assessed and remediated.

Include enough information to reproduce the issue safely:

- The affected surface, version or commit, and deployment type.
- The expected behavior, observed behavior, and potential security impact.
- Minimal reproduction steps or a proof of concept using synthetic data.
- Relevant sanitized logs, screenshots, and any known workaround.

Do not send passwords, access tokens, private keys, real financial records, or
other users' data. Describe the exposure and use redacted or synthetic examples.
Keep testing limited to accounts and deployments you are authorized to use;
do not access other users' data or disrupt the service to demonstrate impact.

## Response and coordinated disclosure

We aim to acknowledge reports within **three business days** and provide an
initial assessment or progress update within **ten business days**. These are
best-effort targets, not guaranteed response times. If you have not received an
acknowledgement, follow up in the same email thread.

Maintainers will assess the report, discuss any needed reproduction details,
and coordinate a fix and disclosure timing with the reporter. Resolution time
depends on severity, reproducibility, and the affected releases. Please
coordinate public disclosure with the maintainers so affected users have an
opportunity to update. Where appropriate, the fix and remediation guidance will
be included in a security advisory or release notes.

## Secrets in the repository

Follow the [secret-handling policy](./CONTRIBUTING.md#never-commit-secrets).
Gitleaks checks every push and pull request. If a credential may have been
committed, treat it as compromised and rotate or revoke it promptly; report the
repository path and commit privately to the address above without copying the
credential into the report. Removing a credential from the current tree does
not remove it from Git history.

## Other reports

Use the [issue forms](https://github.com/bex-co/beancount-io/issues/new/choose)
for ordinary bugs and feature requests. Report community conduct concerns via
the separate contact in our [code of conduct](./CODE_OF_CONDUCT.md#enforcement).
