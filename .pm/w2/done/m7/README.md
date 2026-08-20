# w2 · m7 — Extensionless text preview: LICENSE and common repo files

**Worker:** worker2 **Goal:** `LICENSE`, `Makefile`, `Dockerfile`, `.gitignore` and other extensionless/dotfile text files render in the blob preview as editable text instead of "Unsupported file format ()" **Status:** done

## Tasks (in order)

| id   | title   | est | depends_on |
| ---- | ------- | --- | ---------- |
| t001 | Define allowlist + content-sniff strategy for extensionless text files | 30m | —          | — **DONE** |
| t002 | Extend `isTextFile`/`getFileType` with basename allowlist | 45m | t001       | — **DONE** |
| t003 | Update `getFileLanguage`/`getMimeType` and blob download path | 30m | t002       | — **DONE** |
| t004 | Route extensionless text through `TextFileView` + fix `UnknownFileView` empty-ext message | 30m | t002       | — **DONE** |
| t005 | Tests for extensionless/dotfile/unknown cases + manual LICENSE verification | 45m | t002       | — **DONE** |
| t006 | Adoption surface — ledger file preview discoverable and consistent | 20m | t005       | — **DONE** |
| t007 | Simplify | 20m | t006       | — **DONE** |
| t008 | Test coverage | 30m | t006       | — **DONE** |
| t009 | Closeout | 15m | t008       | — **DONE** |

## Definition of done

- Visiting `/ledger/TinySnow/master/files/blob/main/LICENSE` (and `Makefile`, `Dockerfile`, `.gitignore`, `CONTRIBUTING`, `CODE_OF_CONDUCT` fixtures) shows Monaco text preview with edit/download, not `UnknownFileView`. Binary `unknown` files still show the unsupported message.
- `dashboard/src/features/ledger-editor/shared/lib/utils.ts` `isTextFile`/`getFileType` handle well-known basenames case-insensitively and dotfiles; `getFileLanguage` returns `plaintext/markdown/shell/dockerfile/makefile` for them; no regression for `*.bean`/`*.beancount`/`*.md`/`*.txt`.
- `yarn test` in `dashboard/` green for `shared/lib/__tests__/utils.test.ts` and file-view components.

## Source + Goal linkage

- **Source:** User report 2026-08-19 — `https://beancount.io/ledger/TinySnow/master/files/blob/main/LICENSE` shows `Unsupported file format ()` though file is text; deep research on `dashboard/src/features/ledger-editor/shared/lib/utils.ts:32` (`getFileExtension` → `""`), `isTextFile:50`, `getFileType:95`, `FileContentView:67`, `UnknownFileView:331`.
- **Goal linkage:** **A2 — Frictionless onboarding.** File browser is the primary ledger surface newcomers touch; broken preview on standard repo files (`LICENSE`, `README`-adjacent) erodes trust and blocks onboarding. Fix is dashboard-local, extension of existing text-file rails, not a re-implementation of upstream.
- **Expected outcome:** Any newcomer or agent browsing a ledger sees correct text preview for conventional extensionless text files; `UnknownFileView` only for true binaries. Reduces support confusion and aligns with GitHub/GitLab linguist expectations.
- **Why now:** TinySnow is a public demo ledger linked from the site; the bug is user-visible on the share URL. Patch is isolated to `dashboard/src/features/ledger-editor/shared/lib/utils.ts` and `file-editor` views, low risk, unblocks adoption surface for `w2` closed milestones that drive users to the dashboard.
