import {
  Navigate,
  createFileRoute,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { z } from "zod";
import {
  searchBoolean,
  searchEnum,
  searchPositiveInteger,
  searchString,
} from "@/common/lib/search-params/tolerant";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import FilesContentPage from "@/features/ledger-editor/files-content";
import { fileHandoff } from "@/features/ledger-editor/files-content/file-handoff";

const filesSchema = z.object({
  type: searchEnum(["file", "dir"]).transform((type) => type ?? "dir"),
  path: searchString().transform((path) => path ?? ""),
  editMode: searchBoolean(),
  lineNumber: searchPositiveInteger(),
});

const ROUTE_ID = "/ledger/$ledgerOwner/$ledgerName/files/content";

function FilesContentRoute() {
  const params = useParams({ from: ROUTE_ID });
  const search = useSearch({ from: ROUTE_ID });
  const handoff = fileHandoff(params, search);
  // After mount, not in beforeLoad: a redirect there changes the initial
  // route while it hydrates, which React reports as error #418 (w4/1094).
  // The directory page never mounts for a file, so no directory read is made.
  return handoff ? <Navigate {...handoff} /> : <FilesContentPage />;
}

/**
 * Files content route for webview usage
 * Uses query parameters instead of path-based routing for backward compatibility
 *
 * Format: /files/content?type=dir&path=some/path
 *
 * `type=file` is a compatibility alias: this route only renders the directory
 * browser, so a file target is handed to the canonical blob route instead of
 * being sent to the directory API, which rejects it. The handoff replaces the
 * alias in history so Back leaves the Files browser rather than bouncing.
 */
export const Route = createFileRoute(ROUTE_ID)({
  component: FilesContentRoute,
  validateSearch: (search) => filesSchema.parse(search),
  head: (args) => createLedgerHead(args, "ledgerFiles", { noIndex: true }),
  ssr: false, // Disable SSR - dedicated route for webview with client-side auth
});
