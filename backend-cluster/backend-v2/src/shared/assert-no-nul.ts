import { ARGUMENT_LIMITS } from "@/shared/argument-limits";
import { BadUserInputError } from "@/shared/errors/domain-errors";

/**
 * The git host cannot store U+0000 in its text columns and answers a 5xx for
 * one, which the gateway reports as an outage or an internal fault. A free-text
 * parameter forwarded to it is refused here instead, on every surface; the
 * byte is never stripped silently (w23/210).
 */
/** Every member of an id list, named for the parameter the caller sent (w23/218). */
export function assertNoNulIn(
  values: readonly (string | null | undefined)[],
  field: string,
) {
  for (const value of values) assertNoNul(value, field);
}

/**
 * The boundary guard for a whole argument tree (w23/m22, w23/m23). Run before
 * schema validation so no parameter, nested or new, reaches a service holding
 * a value the stores cannot take: U+0000, a lone surrogate (not valid UTF-8),
 * a string, array or nesting past {@link ARGUMENT_LIMITS}. Each is
 * `BAD_USER_INPUT` naming the path; nothing is stripped or truncated.
 * `exempt` names the schema paths whose text is stored verbatim as file
 * content (`files[].content`): they may hold U+0000 and a longer string, but
 * never a lone surrogate. Array members read as `[]` in a path.
 */
export function assertNoNulDeep(
  value: unknown,
  exempt: ReadonlySet<string> = new Set(),
  path = "",
  depth = 0,
) {
  const name = path || "arguments";
  if (typeof value === "string") {
    const isFileText = exempt.has(path);
    const limit = isFileText
      ? ARGUMENT_LIMITS.maxFileTextLength
      : ARGUMENT_LIMITS.maxStringLength;
    if (value.length > limit) {
      throw new BadUserInputError(
        `${name} must be at most ${limit} characters (received ${value.length})`,
        name,
      );
    }
    if (!isFileText) assertNoNul(value, name);
    assertWellFormed(value, name);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (depth >= ARGUMENT_LIMITS.maxDepth) {
    throw new BadUserInputError(
      `${name} is nested more than ${ARGUMENT_LIMITS.maxDepth} levels deep`,
      name,
    );
  }
  if (Array.isArray(value)) {
    if (value.length > ARGUMENT_LIMITS.maxArrayLength) {
      throw new BadUserInputError(
        `${name} must have at most ${ARGUMENT_LIMITS.maxArrayLength} members (received ${value.length})`,
        name,
      );
    }
    for (const item of value) {
      assertNoNulDeep(item, exempt, `${path}[]`, depth + 1);
    }
    return;
  }
  for (const [key, member] of Object.entries(value)) {
    // A key is text too; it reaches the same stores.
    assertNoNul(key, name);
    assertWellFormed(key, name);
    assertNoNulDeep(member, exempt, path ? `${path}.${key}` : key, depth + 1);
  }
}

/** A lone surrogate cannot be encoded as UTF-8; the encoder would swap it for U+FFFD. */
function assertWellFormed(value: string, field: string) {
  if (!value.isWellFormed()) {
    throw new BadUserInputError(
      `${field} must be well-formed Unicode text (it contains an unpaired surrogate)`,
      field,
    );
  }
}

export function assertNoNul(value: string | null | undefined, field: string) {
  if (value?.includes("\u0000")) {
    throw new BadUserInputError(
      `${field} must not contain a NUL (U+0000) character`,
      field,
    );
  }
}
