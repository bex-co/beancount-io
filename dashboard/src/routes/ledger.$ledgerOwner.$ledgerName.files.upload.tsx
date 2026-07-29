import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Backward compatibility route for old query-based upload files URLs
 * Redirects to new GitHub-style path-based URLs
 *
 * Old format: /files/upload?dirPath=accounts
 * New format: /files/upload/main/accounts
 */

// Define search schema for backward compatibility
const searchSchema = z.object({
  dirPath: z.string().optional().default(""),
});

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/upload",
)({
  validateSearch: searchSchema,
  beforeLoad: ({ params, search, location }) => {
    // Don't redirect if already on the new format (child route with branch)
    // New format: /ledger/owner/name/files/upload/main/path
    // Pattern check: path contains /upload/ followed by more segments (branch)
    const pathAfterUpload = location.pathname.split("/upload/")[1];
    if (pathAfterUpload && pathAfterUpload.length > 0) {
      return; // Already on new format, let child route handle it
    }

    const { ledgerOwner, ledgerName } = params;
    const dirPath = search.dirPath || "";

    throw redirect({
      to: "/ledger/$ledgerOwner/$ledgerName/files/upload/$branch/$",
      params: {
        ledgerOwner,
        ledgerName,
        branch: "main",
        _splat: dirPath,
      },
      search: {},
    });
  },
});
