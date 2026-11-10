import { BadUserInputError } from "@/shared/errors";
import { assertNoNul } from "@/shared/assert-no-nul";

/**
 * The one commit-message spelling rule every surface applies (w23/m3/t002):
 * the MCP file tools took `description` while REST, GraphQL, and rename took
 * `message`, so one commit-message argument could not be reused across tools.
 * Both spellings are accepted; two different messages are refused rather than
 * guessed. Surfaces keep their own requiredness: MCP file tools require one
 * of the two, while REST and GraphQL leave the message optional (the server
 * defaults it per operation).
 */
export function resolveCommitMessage(
  input: { description?: string | null; message?: string | null },
  opts: { required: true },
): string;
export function resolveCommitMessage(
  input: { description?: string | null; message?: string | null },
  opts: { required: boolean },
): string | undefined;
export function resolveCommitMessage(
  input: { description?: string | null; message?: string | null },
  opts: { required: boolean },
): string | undefined {
  // A message that is blank once trimmed is an omitted one: it wrote a blank
  // commit, and `""` defaulted differently by surface (w1/212, w21/553).
  const description = present(input.description);
  const message = present(input.message);
  if (
    description !== undefined &&
    message !== undefined &&
    description !== message
  ) {
    throw new BadUserInputError(
      "Pass description or message for the commit message, not two different texts.",
    );
  }
  const resolved = description ?? message;
  // git cannot store U+0000 in a commit message: refuse it on preview and
  // commit alike, not as an outage after the preview promised success (w23/220).
  assertNoNul(resolved, description !== undefined ? "description" : "message");
  if (resolved === undefined && opts.required) {
    throw new BadUserInputError(
      "A commit message is required — description or message, not blank.",
    );
  }
  return resolved;
}

/** The text, or `undefined` when it is missing or only whitespace. */
function present(text: string | null | undefined): string | undefined {
  return text === null || text === undefined || text.trim() === ""
    ? undefined
    : text;
}
