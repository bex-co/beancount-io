import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { applyCacheHeaders } from "@/common/lib/http/cache-headers";

// Static files are served before this handler runs, so hashed build assets
// keep their own long-lived headers; only server-rendered responses (pages and
// the 404 for a build asset that no longer exists) pass through here.
export default createServerEntry({
  async fetch(request, ...rest) {
    const response = await handler.fetch(request, ...rest);
    return applyCacheHeaders(request, response);
  },
});
