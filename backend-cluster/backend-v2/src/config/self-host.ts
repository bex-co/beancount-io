/**
 * SELF_HOST=true: the operator runs the whole stack for their own users.
 *
 * Read from the environment on each call rather than captured at import, so
 * it is the one switch everything agrees on (config, billing tier, sign-up)
 * and a test can flip it. Off unless exactly "true", so a missing or garbled
 * value never relaxes a managed deployment.
 */
export function isSelfHost(): boolean {
  return process.env.SELF_HOST === "true";
}
