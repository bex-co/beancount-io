# Contributing to Beancount.io

Thanks for your interest in improving [Beancount.io](https://beancount.io/). This
repository is a monorepo of independent packages; read this guide and the root
[`AGENTS.md`](./AGENTS.md) before opening a pull request.

Participation follows our [code of conduct](./CODE_OF_CONDUCT.md). Report
vulnerabilities privately using the [security policy](./SECURITY.md); conduct
complaints use the separate contact in the code of conduct.

## Repository layout

| Path | What belongs here | Start here |
| --- | --- | --- |
| [`dashboard/`](./dashboard/) | Web client: ledgers, reports, imports, and collaboration | [Development guide](./dashboard/README.md) · [package rules](./dashboard/AGENTS.md) |
| [`mobile/`](./mobile/) | React Native iOS and Android app | [Development guide](./mobile/README.md) · [package rules](./mobile/AGENTS.md) |
| [`cli/`](./cli/) | Python `bea` CLI and its bundled reporting resources | [Development guide](./cli/README.md) · [package rules](./cli/AGENTS.md) |
| [`backend-cluster/`](./backend-cluster/) | API gateway, ledger service, contracts, and Ask-AI sandbox control plane | [API gateway](./backend-cluster/backend-v2/README.md) · [ledger](./backend-cluster/ledger/README.md) · [IDL rules](./backend-cluster/idl/AGENTS.md) · [agent-box](./backend-cluster/agent-box/README.md) |
| [`skills/`](./skills/) | Customer-facing `beancount-*` ledger skills; guides in `docs/skills/`, tooling in `scripts/skills/` | [Suite guide](./skills/README.md) · [package rules](./skills/AGENTS.md) |
| [`.agents/skills/`](./.agents/skills/) | Internal development workflows: PM, release, QA, maintenance, and diagrams | [Development skill catalog and rules](./.agents/AGENTS.md) |
| [`deploy/`](./deploy/) | Full-stack local, self-hosted, and managed deployment targets | [Target guide](./deploy/AGENTS.md) · [local stack](./deploy/docker-mac/README.md) · [single-server deployment](./deploy/docker/README.md) |
| [`docs/`](./docs/) | Architecture decisions and shared documentation, including customer skill guides | [Architecture decision index](./docs/adrs/README.md) · [customer skill installation](./docs/skills/installation.md) |

Each package owns its dependencies, scripts, and any tracked lockfiles.
Packages are independent — do not add cross-package imports. Scope every change to
a single package and `cd` into it before running its scripts.

## Development setup

There is no root package to install. Use the relevant development guide in the
table above, then follow that package's `AGENTS.md` for its package manager,
runtime, environment placeholders, and checks. Dashboard and mobile use different
Yarn majors; run commands from the owning package so its local configuration wins.
The CLI uses uv. For a backend change, read the owning service's guide rather
than treating `backend-cluster/` as one Node package. For deployment changes,
choose one target and read its README before running Compose commands.

The [root tooling guide](./AGENTS.md#tooling) records supported runtimes and
path-filtered CI. Use the **Quality bar** table under
[Run from source in the README](./README.md#run-from-source) for the dashboard,
mobile, CLI, and skills checks; backend services and deployment targets document
their native validation in their scoped `AGENTS.md` files. Use those canonical
tables when checking your change.

## Your first pull request

1. Find a small [open issue marked `good first issue`](https://github.com/bex-co/beancount-io/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22).
   If none are available, choose another scoped open issue or use the
   [issue forms](https://github.com/bex-co/beancount-io/issues/new/choose) to discuss
   a small change. Agree on the intended behavior before starting substantial work.
2. Pick the owning package from the table above and read its guide and rules.
   Follow that guide's setup steps, create a focused branch in your fork or
   checkout, and keep real credentials in ignored local configuration.
3. Make the smallest change that solves the issue. Reproduce a reported bug and
   add a regression check where it provides useful protection; documentation-only
   changes should be checked for accurate instructions and working links.
4. Run the owning package's checks from its directory, using the canonical
   sources linked above. For root community documents and issue forms, run the
   community-files validator used by
   [CI (community files)](./.github/workflows/ci-community-files.yml).
5. Open a pull request using the [PR template](./.github/pull_request_template.md).
   Link the issue, explain the resulting behavior, and report the checks you
   actually ran and any remaining limitations. Use the review discussion to settle
   follow-up changes.

## Issues and the adoption board

The [issue chooser](https://github.com/bex-co/beancount-io/issues/new/choose)
routes bug reports, feature requests, agent-skill requests, and self-hosting help
through forms. Maintainers triage by the affected package and the type of work;
`good first issue` identifies work intended for newcomers. Include the package,
version or commit, and a reproducible example when reporting a problem.

The public [`.pm` adoption board](./.pm/README.md) records worker queues,
milestones, task dependencies, and inbox notes. Read the item's current status
and acceptance criteria: archived work is history, and blocked work needs its
written unblock condition cleared. A board note does not mean a public issue is
unclaimed or still reproducible. If an issue links a board item, keep that link
in the PR so maintainers can reconcile both records. Repository agents update
board state through `/pm` under its documented conventions.

## Never commit secrets

**No secret ever belongs in this public repository.** This is a hard rule, enforced
by an automated [gitleaks](https://github.com/gitleaks/gitleaks) scan on every push
and pull request.

- Real credentials live only in local `.env` files, which are gitignored
  (`.env`, `.env.local`, `.env.*.local`). Never commit them.
- Commit only `.env.example` files that declare which variables a package needs,
  with placeholder values — never real ones.
- `EXPO_PUBLIC_*` / `VITE_*`-style variables are compiled into public client
  bundles and are not secrets by nature; still keep their real values out of the
  repo and document them in `.env.example`.
- Before pushing, you can scan your working tree locally:

  ```zsh
  gitleaks dir . --redact --verbose
  ```

If you believe a secret was ever committed, treat it as compromised: rotate or
revoke it immediately, then report the affected path and commit privately using
the [security policy](./SECURITY.md). Do not copy the secret into an issue or email.

## License

The [MIT License](./LICENSE) applies by default. The customer-facing skill suite
uses [MIT No Attribution (MIT-0)](./skills/LICENSE), and included upstream work
retains its own license; see [ACKNOWLEDGEMENTS.md](./ACKNOWLEDGEMENTS.md). By
contributing, you agree to the applicable license for the component you change.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
  messages and PR titles (e.g. `feat(mobile): ...`, `fix(cli): ...`,
  `chore: ...`).
- Keep each PR scoped to one package where possible.
- Make sure the package's own checks pass locally before opening the PR; CI runs
  lint, typecheck, and tests per package on every pull request.
- Never modify a `yarn.lock` by hand — let the package manager manage it.

## Have a question?

Ask us at https://t.me/beancount
