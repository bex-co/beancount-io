import { publicProfileRoute } from "./public-profile-route";
import type Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import {
  anonymousV1Route,
  registerV1Routes,
  type V1Deps,
} from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

export const socialListQuery = z.object({
  username: z.string(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
const userList = z.object({
  users: z.array(
    z.object({
      username: z.string(),
      fullName: z.string().optional(),
      avatarUrl: z.string().optional(),
      bio: z.string().optional(),
    }),
  ),
  total: z.number(),
});
const repositories = z.object({
  repositories: z.array(
    z.object({
      name: z.string(),
      fullName: z.string(),
      description: z.string().optional(),
      isPrivate: z.boolean(),
      updatedAt: z.date(),
      starsCount: z.number().optional(),
    }),
  ),
  total: z.number(),
});

export const SOCIAL_READS = [
  {
    name: "userFollowers",
    path: "followers",
    method: "getUserFollowers",
    response: userList,
  },
  {
    name: "userFollowing",
    path: "following",
    method: "getUserFollowing",
    response: userList,
  },
  {
    name: "userStarredRepos",
    path: "starred-repositories",
    method: "getUserStarredRepos",
    response: repositories,
  },
] as const;
export const SOCIAL_V1_ROUTES = [
  publicProfileRoute,
  ...SOCIAL_READS.map((read) =>
    anonymousV1Route({
      method: "get",
      path: `/api-gateway/v1/social/${read.path}`,
      summary: `Read ${read.path}`,
      description:
        "Public social discovery. page defaults to 1 and limit to 20. total is the returned page size. Existing upstream failures return an empty page.",
      query: socialListQuery,
      responses: { 200: json("Social discovery page", read.response) },
      handler: async ({ layers }, { query }) =>
        layers.services.userProfile[read.method](
          query.username,
          query.page,
          query.limit,
        ),
    }),
  ),
];
export function setSocialRoutes(router: Router, deps: V1Deps): void {
  registerV1Routes(router, deps, SOCIAL_V1_ROUTES);
}
