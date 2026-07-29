import { createFileRoute } from "@tanstack/react-router";
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
 */
export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/content",
)({
  component: FilesContentPage,
  validateSearch: (search) => filesSchema.parse(search),
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata("seo.ledgerFiles.title", "seo.ledgerFiles.description", {
        ledgerName: params.ledgerName,
      }),
    ),
  ssr: false, // Disable SSR - dedicated route for webview with client-side auth
});
