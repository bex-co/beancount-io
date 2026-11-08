/**
 * The shape ceilings every API argument tree is held to before a service sees
 * it (w23/m23), on MCP, REST and GraphQL alike. They bound what a caller can
 * make the server walk, copy or forward: a value past one is refused as
 * `BAD_USER_INPUT` naming the parameter, instead of surfacing as a 5xx, a
 * stalled worker or a silently rewritten byte.
 *
 * The numbers sit far above legitimate use — a typed entry nests about six
 * levels, a batch write carries hundreds of members, a ledger file is capped at
 * 1 MiB by `explicit-file-size.ts` — so a refusal always means a malformed or
 * hostile request. The MCP guide states the same figures
 * (`docs/mcp.md`, "Argument limits"); `mcp-docs.test.ts` keeps them in step.
 */
export const ARGUMENT_LIMITS = {
  /** Levels of array/object nesting under the argument object. */
  maxDepth: 32,
  /** Members in any one array. */
  maxArrayLength: 10_000,
  /** UTF-16 code units in any one string that is not stored as file text. */
  maxStringLength: 1024 * 1024,
  /** The same ceiling for the exempt file-text paths (`content`, `text`, …). */
  maxFileTextLength: 8 * 1024 * 1024,
} as const;
