/**
 * SELF_HOST=true: the operator runs the whole stack for their own users.
 *
 * Read from the environment on each call, so a test can flip it. The same
 * variable feeds `config.selfHost` (captured at startup, for code that already
 * holds the config) and the billing tier lookup, which has no config in reach.
 * Off unless exactly "true", so a missing or garbled value never relaxes a
 * managed deployment.
 */
export function isSelfHost(): boolean {
  return process.env.SELF_HOST === "true";
}
