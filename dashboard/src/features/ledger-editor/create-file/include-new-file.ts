import type { ApolloClient } from "@apollo/client";
import {
  GetLedgerFileDocument,
  GetLedgerSourceFilesDocument,
  UpdateLedgerFileDocument,
} from "@/graphql/definitions";
import {
  base64Decode,
  base64Encode,
  hasUtf8Bom,
  isStrictUtf8,
} from "@/common/lib/utils/encode";

export const ENTRY_POINT = "main.bean";

export function canIncludeNewFile(path: string): boolean {
  return /\.(bean|beancount)$/.test(path) && path !== ENTRY_POINT;
}

const INCLUDE_LINE =
  /^[ \t]*include[ \t]+"([^"\r\n]*)"[^\r\n]*(\r\n|\n|\r|$)/gm;

function withIncludeLine(content: string, path: string): string | null {
  // A bracket in a portable file name can start an include glob. Use a
  // character class containing only a literal opening bracket.
  const target = path.replaceAll("[", "[[]");
  const eol = content.match(/\r\n|\n|\r/)?.[0] ?? "\n";
  let at = content.length;
  for (const match of content.matchAll(INCLUDE_LINE)) {
    if (match[1] === target) return null;
    at = match.index + match[0].length;
  }
  const before = content.slice(0, at);
  const separator = before && !/[\r\n]$/.test(before) ? eol : "";
  return `${before}${separator}include "${target}"${eol}${content.slice(at)}`;
}

/** Add a direct include only when the new file isn't already loaded. */
export async function includeNewFile({
  client,
  ledgerId,
  path,
  notLoaded,
  message,
}: {
  client: ApolloClient;
  ledgerId: string;
  path: string;
  notLoaded: readonly string[];
  message: string;
}): Promise<boolean> {
  if (!notLoaded.includes(path)) {
    // An absent write warning can mean the file matched an existing glob or
    // the server couldn't check which files are loaded. Read the closure.
    const { data } = await client.query({
      query: GetLedgerSourceFilesDocument,
      variables: { ledgerId },
      fetchPolicy: "no-cache",
    });
    if (data?.getLedgerSourceFiles.includes(path)) return false;
  }

  const { data } = await client.query({
    query: GetLedgerFileDocument,
    variables: { ledgerId, path: ENTRY_POINT },
    fetchPolicy: "no-cache",
  });
  const root = data?.getLedgerFile;
  if (
    !root?.sha ||
    root.type !== "file" ||
    root.encoding !== "base64" ||
    atob(root.content ?? "").length !== root.size ||
    !isStrictUtf8(root.content)
  ) {
    throw new Error("Couldn't read the entry point as UTF-8");
  }

  const content = withIncludeLine(base64Decode(root.content ?? ""), path);
  if (content === null) return false;

  const bom = hasUtf8Bom(root.content) ? "\uFEFF" : "";
  const result = await client.mutate({
    mutation: UpdateLedgerFileDocument,
    variables: {
      ledgerId,
      path: ENTRY_POINT,
      sha: root.sha,
      content: base64Encode(bom + content),
      message,
    },
  });
  if (!result.data?.updateLedgerFile) {
    throw new Error("The entry point update returned no revision");
  }
  return true;
}
