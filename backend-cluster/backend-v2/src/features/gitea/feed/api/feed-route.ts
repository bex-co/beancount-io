import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

export const feedQuery = z.object({
  offset: z.coerce.number().default(0),
  limit: z.coerce.number().default(10),
  source: z.string().optional(),
  locale: z.string().optional(),
});

export const feedRoute = v1Route({
  method: "get",
  path: "/api-gateway/v1/account/feed",
  summary: "Read your activity feed",
  description:
    "Merged blog, release, and ledger activity, newest first. Requires a session or account-wide OAuth credential with ledger.read. Source accepts BLOG, CHANGELOG, or LEDGER_RSS case-insensitively; omitted or empty means all sources. Locale defaults to the caller's profile then English. Offset defaults to 0 and limit to 10.",
  query: feedQuery,
  responses: {
    200: json(
      "Activity feed",
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            summary: z.string().optional(),
            link: z.string(),
            publishedAt: z.date(),
            author: z.string().optional(),
            authorAvatar: z.string().optional(),
            source: z.enum(["BLOG", "LEDGER_RSS", "CHANGELOG"]),
          }),
        ),
        total: z.number(),
        hasMore: z.boolean(),
      }),
    ),
  },
  handler: async ({ layers }, { identity, query }) =>
    layers.services.feed.getFeed(query, identity),
});
