# w4 · m15 — Associate authentication validation errors with their fields

**Worker:** worker1 **Goal:** readers can identify and correct invalid sign-in, recovery and registration fields through assistive technology **Status:** todo (t001–t004 done)

Minor accessibility defects, dashboard only. Three forms show local validation errors without exposing invalid state or associating the message with the field. Reproduced browser evidence and safe no-request controls are in [FINDINGS.md](./FINDINGS.md).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Associate sign-in and recovery field errors — **DONE** | 40m | — |
| t002 | Associate registration field errors while preserving Username — **DONE** | 30m | t001 |
| t003 | Verify the authentication adoption surface — **DONE** | 10m | t001, t002 |
| t004 | Simplify the validation attribute changes — **DONE** | 10m | t003 |
| t005 | Test real validation, correction and focus behavior | 40m | t003, t004 |
| t006 | Close and archive the verified repair | 10m | t005 |

70 implementation minutes; 140 minutes across six tasks. This exceeds a sub-hour inbox note because three independently implemented forms and their real validation/recovery paths need coverage.

## Definition of done

- Login's invalid email/password, recovery's invalid email, and registration's invalid email/password/confirmation expose invalid state and descriptions resolving to their visible validation errors.
- IDs stay stable and do not collide; descriptions/invalid state clear after correction, while persistent hints such as Username's remain.
- Validation changes are appropriately announced without duplicate messages. Existing focus-first-invalid behavior, visibility toggles, onTouched/submit timing and disabled/pending states remain intact.
- Empty local validation does not invoke sign-in, recovery or registration mutations. Safe next links and consent wrapper contracts remain unchanged.
- Initial clean state, invalid and corrected states pass meaningful rendered tests with actual form components, plus desktop/narrow browser metadata checks. No real email or account creation is needed for this repair.
- Dashboard format:check, lint, test and build pass; evidence and unverified actual screen-reader/consent runtime limits are recorded; standing closing work is complete before archival.

## Source + Goal linkage

- **Source:** repeated `$qa-find-bugs-dashboard`, September17,2026; promoted w4/082 after independently reproducing registration in addition to Login and Forgot Password.
- **A2 — Frictionless onboarding:** newcomers using assistive technology can identify why an authentication field was rejected and correct it.
- **Expected outcome:** focusing an invalid field exposes the same actionable message that is visible on screen, through registration, sign-in and recovery.
- **Why now:** the working Username pattern and standard Input prop forwarding already exist; repair the inconsistent forms together while preserving shared consent use. A three-form change and behavioral tests now exceed the inbox sizing limit.
- **Adoption surface included:** these are first-use user-facing flows. No new API, package, dependency, skill, production mutation or authorization policy is proposed.
