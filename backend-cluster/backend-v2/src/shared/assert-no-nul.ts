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
 * Refuses U+0000 in any string anywhere inside `value` — the boundary form of
 * `assertNoNul` for a whole argument tree (w23/m22). Run before schema
 * validation so no parameter, nested or new, can reach a service holding the
 * byte. `exempt` names the schema paths whose text is stored verbatim as file
 * content (`files[].content`); array members read as `[]` in a path.
 */
export function assertNoNulDeep(
  value: unknown,
  exempt: ReadonlySet<string> = new Set(),
  path = "",
) {
  if (typeof value === "string") {
    if (!exempt.has(path)) assertNoNul(value, path || "arguments");
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoNulDeep(item, exempt, `${path}[]`);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, member] of Object.entries(value)) {
      // A key is text too; a NUL there would reach the same stores.
      assertNoNul(key, path || "arguments");
      assertNoNulDeep(member, exempt, path ? `${path}.${key}` : key);
    }
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
