import {
  BadUserInputError,
  InternalServerError,
  ResourceLimitReachedError,
} from "@/shared/errors";

/** Runtime shape from Gitea; large blobs use `content: null` despite its spec. */
export interface GiteaTextContents {
  content?: string | null;
  encoding?: string | null;
  sha?: string | null;
}

/** The generated Gitea client surface needed to fetch an oversized raw blob. */
export interface GiteaRawFileClient {
  repoGetRawFileOrLfs?: (
    owner: string,
    repo: string,
    filepath: string,
    query?: { ref?: string },
    params?: { format?: "blob" },
  ) => Promise<{ data: unknown }>;
}

export interface GiteaTextReadLimits {
  /** Reject the decoded blob before materializing more than this many bytes. */
  maxBytes?: number;
  /** Reject invalid UTF-8 and NUL-bearing binary content. */
  requireUtf8?: boolean;
  /**
   * Reject invalid UTF-8 only, and keep a leading byte-order mark in the text,
   * for a reader that writes the file back and must not alter its bytes
   * (w21/691).
   */
  rejectInvalidUtf8?: boolean;
}

function assertWithinByteLimit(size: number, maxBytes?: number): void {
  if (maxBytes !== undefined && size > maxBytes) {
    throw new ResourceLimitReachedError(
      "Ledger source file bytes",
      maxBytes,
      size,
    );
  }
}

/**
 * A file `requireUtf8` refused: invalid UTF-8, or NUL-bearing binary data.
 * Its own class so the FileMap loader can keep the ledger readable around a
 * file nothing includes (w23/011).
 */
export class UndecodableTextError extends BadUserInputError {}

function decodeText(buffer: Buffer, limits: GiteaTextReadLimits): string {
  assertWithinByteLimit(buffer.byteLength, limits.maxBytes);
  if (limits.rejectInvalidUtf8 === true) {
    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        buffer,
      );
    } catch {
      throw new UndecodableTextError("Ledger files must be valid UTF-8 text");
    }
  }
  if (limits.requireUtf8 !== true) return buffer.toString("utf-8");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new UndecodableTextError(
      "Included ledger files must be valid UTF-8 text",
    );
  }
  if (text.includes("\0")) {
    throw new UndecodableTextError(
      "Included ledger files must be text, not binary data",
    );
  }
  return text;
}

function decodeInlineContent(
  response: GiteaTextContents,
  limits: GiteaTextReadLimits,
): string | undefined {
  if (response.content === undefined || response.content === null) {
    return undefined;
  }
  if (response.encoding && response.encoding !== "base64") {
    return decodeText(Buffer.from(response.content, "utf-8"), limits);
  }
  const decodedSize = Buffer.byteLength(response.content, "base64");
  assertWithinByteLimit(decodedSize, limits.maxBytes);
  return decodeText(Buffer.from(response.content, "base64"), limits);
}

async function rawDataToBuffer(
  data: unknown,
  maxBytes?: number,
): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    assertWithinByteLimit(data.byteLength, maxBytes);
    return data;
  }
  if (typeof data === "string") {
    const buffer = Buffer.from(data, "utf-8");
    assertWithinByteLimit(buffer.byteLength, maxBytes);
    return buffer;
  }
  if (data instanceof ArrayBuffer) {
    assertWithinByteLimit(data.byteLength, maxBytes);
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    assertWithinByteLimit(data.byteLength, maxBytes);
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data !== null && typeof data === "object" && "headers" in data) {
    const headers = (
      data as { headers?: { get?: (name: string) => string | null } }
    ).headers;
    const declared = headers?.get?.("content-length");
    if (declared !== null && declared !== undefined) {
      const declaredBytes = Number(declared);
      if (Number.isFinite(declaredBytes)) {
        assertWithinByteLimit(declaredBytes, maxBytes);
      }
    }
  }
  if (data !== null && typeof data === "object" && "body" in data) {
    const body = (
      data as {
        body?: {
          getReader?: () => {
            read(): Promise<{ done: boolean; value?: Uint8Array }>;
            cancel(reason?: unknown): Promise<void>;
          };
        } | null;
      }
    ).body;
    const reader = body?.getReader?.();
    if (reader) {
      const chunks: Buffer[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value === undefined) continue;
        total += value.byteLength;
        try {
          assertWithinByteLimit(total, maxBytes);
        } catch (error) {
          await reader.cancel(error).catch(() => undefined);
          throw error;
        }
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks, total);
    }
  }
  if (
    data !== null &&
    typeof data === "object" &&
    "size" in data &&
    typeof data.size === "number"
  ) {
    assertWithinByteLimit(data.size, maxBytes);
  }
  if (
    data !== null &&
    typeof data === "object" &&
    "arrayBuffer" in data &&
    typeof (data as { arrayBuffer?: unknown }).arrayBuffer === "function"
  ) {
    const arrayBuffer = await (
      data as { arrayBuffer(): Promise<ArrayBuffer> }
    ).arrayBuffer();
    assertWithinByteLimit(arrayBuffer.byteLength, maxBytes);
    return Buffer.from(arrayBuffer);
  }
  throw new InternalServerError("Malformed Gitea raw-file response");
}

/**
 * The bytes of a blob Gitea left out of its contents response (`content:
 * null`), fetched from the raw endpoint. Throws `ResourceLimitReachedError`
 * past `maxBytes` while streaming.
 */
export async function readGiteaRawBuffer(
  repos: GiteaRawFileClient,
  owner: string,
  repo: string,
  filepath: string,
  response: GiteaTextContents,
  query?: { ref?: string },
  maxBytes?: number,
): Promise<Buffer> {
  if (!response.sha) {
    throw new InternalServerError(
      `Gitea omitted both content and SHA for ledger file "${filepath}"`,
    );
  }
  if (!repos.repoGetRawFileOrLfs) {
    throw new InternalServerError(
      `Gitea omitted inline content for ledger file "${filepath}" and no raw-file client is available`,
    );
  }

  // With a byte cap, request the generated client's raw Response so we can
  // enforce the limit while streaming. The normal
  // write/tool paths keep the existing Blob behavior when no cap is requested.
  const fetchRaw = repos.repoGetRawFileOrLfs as (
    owner: string,
    repo: string,
    filepath: string,
    query?: { ref?: string },
    params?: { format?: "blob" | "raw" },
  ) => Promise<{ data: unknown }>;
  const raw = await fetchRaw(owner, repo, filepath, query, {
    format: maxBytes === undefined ? "blob" : "raw",
  });
  const responseLike = raw as unknown as {
    data?: unknown;
    body?: unknown;
    arrayBuffer?: unknown;
  };
  const payload =
    maxBytes === undefined
      ? responseLike.data
      : responseLike.body !== undefined ||
          typeof responseLike.arrayBuffer === "function"
        ? responseLike
        : responseLike.data;
  return rawDataToBuffer(payload, maxBytes);
}

/**
 * Decode a Gitea contents response, falling back to the raw/media endpoint for
 * blobs larger than Gitea's inline-content limit. A contents response with a
 * valid SHA and `content: null` is an existing large file, never an empty file.
 */
export async function readGiteaFileText(
  repos: GiteaRawFileClient,
  owner: string,
  repo: string,
  filepath: string,
  response: GiteaTextContents,
  query?: { ref?: string },
  limits: GiteaTextReadLimits = {},
): Promise<string> {
  const inline = decodeInlineContent(response, limits);
  if (inline !== undefined) return inline;
  const raw = await readGiteaRawBuffer(
    repos,
    owner,
    repo,
    filepath,
    response,
    query,
    limits.maxBytes,
  );
  return decodeText(raw, limits);
}
