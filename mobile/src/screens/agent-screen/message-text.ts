import type { UIMessage } from "ai";

/**
 * The message's text.
 *
 * A step's streaming deltas accumulate into a single text part, so more than
 * one part means the agent spoke, ran a tool, then spoke again. Joining those
 * with nothing ran the sentences together — "Let me try again.It seems there
 * is an ongoing issue" — so they are separated as the paragraphs they are.
 *
 * Kept apart from the component that renders it: the unit runner cannot load a
 * module that pulls in React Native, and this is the half worth testing.
 */
export function messageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text.trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}
