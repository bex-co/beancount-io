import { BadUserInputError } from "@/shared/errors";

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
  const description = input.description ?? undefined;
  const message = input.message ?? undefined;
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
  if (resolved === undefined && opts.required) {
    throw new BadUserInputError(
      "A commit message is required — description or message.",
    );
  }
  return resolved;
}
