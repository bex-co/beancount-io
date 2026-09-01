/**
 * Framing helpers for relaying an SSH git session to Gitea over HTTP.
 *
 * The two transports carry the same pack protocol but frame it differently, and
 * these functions are the whole of that difference. They are kept pure and
 * tested on byte strings, because the network half is the part that cannot be
 * reasoned about from a unit test.
 *
 * Two differences matter:
 *
 * 1. **The advertisement.** HTTP prefixes it with a `# service=...` pkt-line
 *    and a flush; SSH does not. Both protocol versions do this, so the strip is
 *    unconditional rather than version-aware.
 *
 * 2. **Session shape.** SSH is one continuous stream; HTTP is a series of
 *    request/response pairs. Splitting the stream back into requests is what
 *    `findRequestEnd` does, and it is the reason protocol v2 matters: in v2
 *    every command is self-contained, so each one becomes exactly one POST.
 */

/**
 * Note on the other pkt-line reader. `advanceCommandListScan` in the HTTP proxy
 * parses the same framing, and merging the two was considered and rejected:
 * they disagree deliberately about the same bytes. A `0001` inside a v2 command
 * is a delimiter this reader must carry, while in a receive-pack command list
 * it is something we could not parse and must refuse. Folding them together
 * would mean a parameter for how to treat specials, which buys less than two
 * short functions that each say plainly what they do.
 */

export interface PktLine {
  /** Payload without the length prefix; null for a flush or delimiter packet. */
  payload: Buffer | null;
  /** Bytes consumed, including the length prefix. */
  length: number;
  /** `0000` flush, `0001` delimiter, `0002` response-end. */
  special: "flush" | "delim" | "response-end" | null;
}

/**
 * Read one pkt-line at `offset`, or null when the buffer does not hold a whole
 * one yet. Returns `undefined` for bytes that are not a pkt-line at all, which
 * callers must treat as unreadable rather than as end-of-input.
 */
export function readPktLine(
  buf: Buffer,
  offset: number,
): PktLine | null | undefined {
  if (offset + 4 > buf.length) return null;
  const hex = buf.subarray(offset, offset + 4).toString("ascii");
  if (!/^[0-9a-fA-F]{4}$/.test(hex)) return undefined;

  const length = parseInt(hex, 16);
  if (length === 0) return { payload: null, length: 4, special: "flush" };
  if (length === 1) return { payload: null, length: 4, special: "delim" };
  if (length === 2)
    return { payload: null, length: 4, special: "response-end" };
  if (length < 4) return undefined;
  if (offset + length > buf.length) return null;

  return {
    payload: buf.subarray(offset + 4, offset + length),
    length,
    special: null,
  };
}

/**
 * Remove HTTP's `# service=...` preamble and the flush that follows it.
 *
 * Returns the buffer unchanged when the preamble is absent, so this is safe to
 * apply to anything: a response that already looks like SSH's passes through.
 */
export function stripServicePreamble(buf: Buffer): Buffer {
  const first = readPktLine(buf, 0);
  if (!first || !first.payload) return buf;
  if (!first.payload.toString("utf8").startsWith("# service=")) return buf;

  const afterLine = first.length;
  const next = readPktLine(buf, afterLine);
  // The preamble is always followed by a flush; if it is not, leave the bytes
  // alone rather than guessing at a shape we do not recognise.
  if (!next || next.special !== "flush") return buf;
  return buf.subarray(afterLine + next.length);
}

export type GitProtocol = "v0" | "v2";

/** Read `version=2` out of the client's GIT_PROTOCOL, which may list several. */
export function parseGitProtocol(value: string | undefined): GitProtocol {
  if (!value) return "v0";
  return value.split(":").includes("version=2") ? "v2" : "v0";
}

export interface RequestBoundary {
  /** Bytes forming one complete request, ready to POST. */
  end: number;
  /**
   * True when this request cannot be expressed as a single stateless POST — a
   * v0 fetch that closed a round of `have` lines and is waiting for an ACK
   * before saying more. Over SSH the server would answer and the conversation
   * would continue on the same connection; over HTTP there is nothing to
   * continue. Never set for a push, which has no negotiation.
   */
  needsNegotiation: boolean;
}

/**
 * Find the end of one complete client request in `buf`, or null if more bytes
 * are needed.
 *
 * v2 is simple: a command ends at its flush packet, and nothing about it
 * depends on what the server said before.
 *
 * v0 upload-pack is not: the client sends `want` lines, a flush, and then
 * either `done` or `have` lines. The request finishes at `done`, so that first
 * flush must be read past — getting this wrong refuses ordinary clones. A
 * *second* flush without `done` is the client waiting for an ACK, which is the
 * one shape this bridge cannot carry and must refuse out loud. That shape turns
 * out to be rare: real git completes a clone, an incremental fetch, and a fetch
 * 60 commits behind in a single round even under `protocol.version=0`.
 */
export function findRequestEnd(
  buf: Buffer,
  protocol: GitProtocol,
  write: boolean,
): RequestBoundary | null | undefined {
  let offset = 0;
  let flushes = 0;

  for (;;) {
    const pkt = readPktLine(buf, offset);
    if (pkt === undefined) return undefined;
    if (pkt === null) return null;

    offset += pkt.length;

    // A push is one request: the command list ends at its flush and the pack
    // follows in the same body, with nothing to negotiate.
    if (write) {
      if (pkt.special === "flush") {
        return { end: offset, needsNegotiation: false };
      }
      continue;
    }

    // Every v2 command is self-contained and ends at its flush.
    if (protocol === "v2") {
      if (pkt.special === "flush") {
        return { end: offset, needsNegotiation: false };
      }
      continue;
    }

    // v0 upload-pack sends `want` lines, a flush, then either `done` (a fresh
    // clone, which has nothing to negotiate) or `have` lines. The request
    // finishes at `done` — NOT at that first flush, which is why a clone has to
    // be read past it.
    const line = pkt.payload?.toString("utf8").trimEnd();

    // Any `have` means the client is negotiating. Measured against a real
    // Gitea, forwarding such a request as one POST returns a response git
    // accepts and then quietly ignores: the fetch exits 0 having updated
    // nothing, so the user believes they are current when they are not. Silent
    // staleness is worse than the error it replaced, so this refuses instead.
    if (line?.startsWith("have ")) {
      return { end: offset, needsNegotiation: true };
    }
    if (line === "done") return { end: offset, needsNegotiation: false };

    if (pkt.special === "flush") {
      flushes += 1;
      if (flushes >= 2) return { end: offset, needsNegotiation: true };
    }
  }
}
