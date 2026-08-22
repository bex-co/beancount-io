import type {
  BeancountError,
  DirectiveJson,
  LedgerOptions,
} from "@rustledger/wasm";
import { pluginError, type PluginContext, type PluginResult } from "./types";
import {
  getDirectiveSourceLocation,
  inheritDirectiveSourceId,
} from "./provenance";

/**
 * Port of fava's `link_documents` plugin. Any entry carrying `document*` string
 * metadata (e.g. `document: "receipt.pdf"`) is linked to matching `document`
 * directives: each matched document gains a `dok-<entry-date>` link and a
 * `#linked` tag, and the entry (when it supports links — i.e. a transaction)
 * gains the same `dok-<entry-date>` link. A referenced document that matches
 * nothing yields a warning.
 *
 * Matching mirrors the Python plugin: a bare basename uses basename + account
 * overlap, while every metadata path is also resolved relative to the source
 * file containing the referencing entry and compared with each Document's
 * source-relative full path. Source locations are carried in the internal
 * provenance sidecar populated by the engine before plugins run.
 */

type Document = Extract<DirectiveJson, { type: "document" }>;

export function linkDocuments(
  directives: DirectiveJson[],
  _options: LedgerOptions,
  _ctx: PluginContext,
): PluginResult {
  // Index document directives by file basename → their positions in the stream.
  const byBasename = new Map<string, number[]>();
  const byFullname = new Map<string, number>();
  directives.forEach((directive, index) => {
    if (directive.type === "document") {
      const key = basename(directive.path);
      const positions = byBasename.get(key) ?? [];
      positions.push(index);
      byBasename.set(key, positions);
      byFullname.set(resolveDirectivePath(directive, directive.path), index);
    }
  });

  // Shallow-clone so we can rewrite documents/entries by position immutably.
  const out: DirectiveJson[] = directives.map((directive) => {
    const clone: DirectiveJson = { ...directive };
    inheritDirectiveSourceId(directive, clone);
    return clone;
  });
  const errors: BeancountError[] = [];

  directives.forEach((entry, index) => {
    if (entry.meta === undefined) return;
    const docNames = Object.entries(entry.meta)
      .filter(
        ([key, value]) =>
          key.startsWith("document") && typeof value === "string",
      )
      .map(([, value]) => value as string);
    if (docNames.length === 0) return;

    const link = `dok-${entry.date}`;
    const accounts = entryAccounts(entry);
    let linkedAny = false;

    docNames.forEach((docName) => {
      // Python indexes `by_basename[disk_doc]` using the metadata value as-is:
      // a value containing a directory does NOT broaden to every document with
      // that basename. It is handled by the exact source-relative lookup below.
      const matches = (
        docName === basename(docName)
          ? (byBasename.get(docName) ?? []).filter((position) =>
              accounts.has((directives[position] as Document).account),
            )
          : []
      ).slice();
      const exact = byFullname.get(resolveDirectivePath(entry, docName));
      if (exact !== undefined && !matches.includes(exact)) matches.push(exact);
      if (matches.length === 0) {
        errors.push(
          pluginError(`Document not found: '${docName}'`, {
            severity: "warning",
          }),
        );
        return;
      }
      matches.forEach((position) => {
        const doc = out[position] as Document;
        const linkedDocument: Document = {
          ...doc,
          links: addToSet(doc.links, link),
          tags: addToSet(doc.tags, "linked"),
        };
        inheritDirectiveSourceId(directives[position], linkedDocument);
        out[position] = linkedDocument;
      });
      linkedAny = true;
    });

    if (
      linkedAny &&
      (entry.type === "transaction" || entry.type === "document")
    ) {
      const linkable = out[index] as Extract<
        DirectiveJson,
        { type: "transaction" | "document" }
      >;
      const linkedEntry = {
        ...linkable,
        links: addToSet(linkable.links, link),
      } as DirectiveJson;
      inheritDirectiveSourceId(entry, linkedEntry);
      out[index] = linkedEntry;
    }
  });

  return { directives: out, errors };
}

/** Accounts referenced by an entry (posting accounts for a txn; `account` else). */
function entryAccounts(directive: DirectiveJson): Set<string> {
  if (directive.type === "transaction") {
    return new Set(directive.postings.map((posting) => posting.account));
  }
  if ("account" in directive && typeof directive.account === "string") {
    return new Set([directive.account]);
  }
  return new Set();
}

function basename(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return slash === -1 ? path : path.slice(slash + 1);
}

/** POSIX-style `normpath`, with Windows separators accepted as input. */
function normalizePath(path: string): string {
  const absolute = path.startsWith("/");
  const parts: string[] = [];
  path
    .replaceAll("\\", "/")
    .split("/")
    .forEach((part) => {
      if (part === "" || part === ".") return;
      if (part === "..") {
        if (parts.length > 0 && parts[parts.length - 1] !== "..") parts.pop();
        else if (!absolute) parts.push(part);
        return;
      }
      parts.push(part);
    });
  const normalized = parts.join("/");
  return absolute ? `/${normalized}` : normalized;
}

function dirname(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const slash = normalized.lastIndexOf("/");
  return slash === -1 ? "" : normalized.slice(0, slash);
}

/** Resolve a document reference from the directive's original source file. */
function resolveDirectivePath(
  directive: DirectiveJson,
  reference: string,
): string {
  if (reference.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(reference)) {
    return normalizePath(reference);
  }
  const sourceFile = getDirectiveSourceLocation(directive)?.filename;
  const parent = sourceFile === undefined ? "" : dirname(sourceFile);
  return normalizePath(parent ? `${parent}/${reference}` : reference);
}

/** Union preserving order, no duplicates (port of fava's `add_to_set`). */
function addToSet(existing: string[] | undefined, value: string): string[] {
  const next = existing ? [...existing] : [];
  if (!next.includes(value)) next.push(value);
  return next;
}
