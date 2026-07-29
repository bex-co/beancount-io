# Contributing to Beancount.io

Thanks for your interest in improving [Beancount.io](https://beancount.io/). This
repository is a monorepo of independent packages; read this guide and the root
[`CLAUDE.md`](./CLAUDE.md) before opening a pull request.

## Repository layout

| Path      | Description                                          |
| --------- | ---------------------------------------------------- |
| `mobile/` | React Native iOS & Android app (Expo, Apollo, TS)    |
| `cli/`    | CLI tool (placeholder until code lands)              |
| `skills/` | Skills package (placeholder until code lands)        |

Each package owns its own dependencies, scripts, and `yarn.lock`/`uv.lock`.
Packages are independent — do not add cross-package imports. Scope every change to
a single package and `cd` into it before running its scripts.

## Development setup

Per-package setup lives next to the code. For the mobile app:

```zsh
cd mobile
yarn install
yarn start
```

See [`mobile/README.md`](./mobile/README.md) for full details, and each package's
own `README.md` / `CLAUDE.md` as they are added.

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
  gitleaks detect --no-git --source .
  ```

If you believe a secret was ever committed, treat it as compromised: rotate it
immediately and open an issue so maintainers can purge it from history.

## License

This repository is licensed under the [MIT License](./LICENSE). The root `LICENSE`
governs all packages; a package may keep its own `LICENSE` file for redistribution
clarity, but it must stay in sync with the root. By contributing, you agree that
your contributions are licensed under the same terms.

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
