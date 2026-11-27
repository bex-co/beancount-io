import { posix } from "node:path";
import { decodeStringLiteral } from "./plugins/collect-plugins";
import { SOURCE_DATE } from "./source-date";

/**
 * A `document` header up to the end of its filename: a date as the lexer reads
 * it (w31/106), the keyword, the account, then the filename as a one-line
 * double-quoted string. Whatever follows (tags, links, a comment) is kept.
 */
const DOCUMENT_HEADER_RE = new RegExp(
  String.raw`^(${SOURCE_DATE}[^\S\r\n]+document[^\S\r\n]+[^\s"]+[^\S\r\n]*)"((?:[^"\\\r\n]|\\.)*)"`,
  "u",
);

/**
 * A moved entry's text with a relative `document` filename rewritten for
 * `toPath`'s folder, so it names the same repository file there (w31/133).
 * Beancount resolves the filename against the directory of the file that
 * declares it, as it does an include, so the text moved as it stood named a
 * file beside `toPath` that is not there.
 *
 * Left as written: any other entry, a move within one folder, a root-anchored
 * or URL filename, one that resolves the same from both folders, and one that
 * names no file in the repository (`exists`), which has nothing to keep.
 */
export function withDocumentPathFor(
  slice: string,
  fromPath: string,
  toPath: string,
  exists: (path: string) => boolean,
): string {
  const toDir = posix.dirname(toPath);
  if (posix.dirname(fromPath) === toDir) return slice;
  const match = DOCUMENT_HEADER_RE.exec(slice);
  if (match === null) return slice;
  const [header, prefix, raw] = match;
  const target = decodeStringLiteral(raw);
  if (target === "" || target.startsWith("/") || /[\r\n]/u.test(target))
    return slice;
  if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(target)) return slice;
  const resolved = posix.join(posix.dirname(fromPath), target);
  if (resolved === posix.join(toDir, target) || !exists(resolved)) return slice;
  const relative = posix.relative(toDir, resolved);
  const written =
    target.startsWith("./") && !relative.startsWith("../")
      ? `./${relative}`
      : relative;
  return `${prefix}"${written.replace(/[\\"]/gu, "\\$&")}"${slice.slice(header.length)}`;
}
