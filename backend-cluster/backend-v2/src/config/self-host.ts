/**
 * SELF_HOST: the operator runs the whole stack for their own users.
 *
 * Read from the environment on each call, so a test can flip it. The same
 * variable feeds `config.selfHost` (captured at startup, for code that already
 * holds the config) and the billing tier lookup, which has no config in reach.
 *
 * An operator types this by hand into a dashboard, an `.env` file or a Compose
 * file, so the usual spellings all mean what they say: `true`, `1`, `yes`, `y`
 * and `on` turn it on, in any case, with stray spaces or one pair of quotes
 * (an `--env-file` keeps the quotes literally). Unset, empty, `false`, `0`,
 * `no`, `n` and `off` leave it off. Anything else is a typo, not a decision:
 * it stays OFF, so a garbled value never relaxes a managed deployment, and
 * {@link readSelfHost} reports it so startup can say so out loud instead of
 * leaving the operator with a verification step they cannot complete.
 */
const ON = new Set(["true", "1", "yes", "y", "on"]);
const OFF = new Set(["", "false", "0", "no", "n", "off"]);

export interface SelfHostSetting {
  readonly on: boolean;
  /** The value as typed, when it is neither a recognised "on" nor "off". */
  readonly unrecognized?: string;
}

function normalise(raw: string): string {
  const trimmed = raw.trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return (quoted ? quoted[2] : trimmed).trim().toLowerCase();
}

export function readSelfHost(raw = process.env.SELF_HOST): SelfHostSetting {
  const value = normalise(raw ?? "");
  if (ON.has(value)) return { on: true };
  if (OFF.has(value)) return { on: false };
  return { on: false, unrecognized: raw };
}

export function isSelfHost(): boolean {
  return readSelfHost().on;
}
