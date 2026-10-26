/** The search a legacy `/files/content` link carries, after validation. */
interface FilesContentSearch {
  type: "file" | "dir";
  path: string;
  editMode?: boolean;
  lineNumber?: number;
}

/**
 * The canonical file route a `type=file` alias asks for, or null for a
 * directory target (including `type=file` with no path).
 */
export function fileHandoff(
  params: { ledgerOwner: string; ledgerName: string },
  search: FilesContentSearch,
) {
  const filePath = search.path.replace(/^\/+/, "");
  if (search.type !== "file" || filePath === "") return null;
  return {
    to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
    params: {
      ledgerOwner: params.ledgerOwner,
      ledgerName: params.ledgerName,
      // Hardcoded to match the rest of the Files browser (see use-file-navigate).
      branch: "main",
      _splat: filePath,
    },
    search: { editMode: search.editMode, lineNumber: search.lineNumber },
    replace: true,
  } as const;
}
