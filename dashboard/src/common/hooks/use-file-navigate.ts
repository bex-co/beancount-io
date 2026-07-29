import { decodeLedgerId } from "@/common/lib/utils/encode.ts";
import { useNavigate } from "@tanstack/react-router";

/**
 * Hook for navigating to files and directories using GitHub-style URLs
 *
 * @example
 * // Navigate to a file
 * fileNavigate(ledgerId, "file", "main.bean", { editMode: true, lineNumber: 42 })
 * // Result: /ledger/owner/name/files/blob/main/main.bean?editMode=true&lineNumber=42
 *
 * // Navigate to a directory
 * fileNavigate(ledgerId, "dir", "accounts")
 * // Result: /ledger/owner/name/files/tree/main/accounts
 */
export const useFileNavigate = () => {
  const navigate = useNavigate();
  return (
    ledgerId: string,
    type: "file" | "dir",
    path: string,
    options?: {
      lineNumber?: number;
      editMode?: boolean;
    },
  ) => {
    const { lineNumber, editMode } = options || {};
    const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);

    // Hardcode branch as "main" for now (future: support multiple branches)
    const branch = "main";

    if (type === "file") {
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner,
          ledgerName,
          branch,
          _splat: path, // TanStack Router uses "_splat" as the key for splat parameters
        },
        search: { editMode, lineNumber },
      });
    } else {
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        params: {
          ledgerOwner,
          ledgerName,
          branch,
          _splat: path, // TanStack Router uses "_splat" as the key for splat parameters
        },
      });
    }
  };
};
