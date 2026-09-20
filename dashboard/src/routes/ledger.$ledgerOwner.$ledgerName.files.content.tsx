import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import FilesContentPage from "@/features/ledger-editor/files-content";

const filesSchema = z.object({
  type: z.enum(["file", "dir"]).default("dir"),
  path: z.string().default(""),
  editMode: z.boolean().optional(),
  lineNumber: z.number().optional(),
});

/**
 * Files content route for webview usage
 * Uses query parameters instead of path-based routing for backward compatibility
 *
 * Format: /files/content?type=dir&path=some/path
 *
 * `type=file` is a compatibility alias: this route only renders the directory
 * browser, so a file target is handed to the canonical blob route instead of
 * being sent to the directory API, which rejects it. The redirect replaces the
 * alias in history so Back leaves the Files browser rather than bouncing.
 */
export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/content",
)({
  component: FilesContentPage,
  validateSearch: (search) => filesSchema.parse(search),
  beforeLoad: ({ params, search }) => {
    const filePath = search.path.replace(/^\/+/, "");
    if (search.type !== "file" || filePath === "") return;
    throw redirect({
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
    });
  },
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerFiles.title",
        "seo.ledgerFiles.description",
        {
          ledgerName: params.ledgerName,
        },
      ),
      { noIndex: true },
    ),
  ssr: false, // Disable SSR - dedicated route for webview with client-side auth
});
