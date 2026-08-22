import { execFileSync } from "node:child_process";

/**
 * Whether the `ssh-keygen` binary exists on this machine.
 *
 * A couple of tests here deliberately check our output against OpenSSH's own
 * tool, because asserting a fingerprint against our own implementation would
 * prove nothing. That is worth keeping, but it cannot be a hard requirement:
 * the CI runner has no `ssh-keygen`, and a missing binary there should not read
 * as a failing proxy. Those tests skip when it is absent and run everywhere it
 * is present, which includes every developer machine and the compose stack.
 *
 * Everything else generates keys through ssh2 instead, so the suite as a whole
 * depends on no external binary.
 */
export const hasSshKeygen: boolean = (() => {
  try {
    execFileSync("ssh-keygen", ["-h"], { stdio: "ignore" });
    return true;
  } catch (err) {
    // `-h` exits non-zero on some builds while still being present; only a
    // missing binary means we cannot use it.
    return (err as NodeJS.ErrnoException)?.code !== "ENOENT";
  }
})();

/** `it`, unless `ssh-keygen` is missing. */
export const itWithSshKeygen = hasSshKeygen ? it : it.skip;
