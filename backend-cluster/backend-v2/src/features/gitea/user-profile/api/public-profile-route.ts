import { z } from "@/shared/zod-openapi-setup";
import { anonymousV1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

export const publicProfileQuery = z.object({ username: z.string() });
const optionalText = z.string().nullable().optional();
const publicProfile = z.object({
  profile: z.object({
    username: z.string(),
    fullName: optionalText,
    avatarUrl: optionalText,
    bio: optionalText,
    location: optionalText,
    website: optionalText,
    followersCount: z.number(),
    followingCount: z.number(),
    starredReposCount: z.number(),
    created: z.date().nullable().optional(),
  }),
  isFollowing: z.boolean().nullable().optional(),
  activities: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      createdAt: z.date(),
      repoName: optionalText,
      repoFullName: optionalText,
    }),
  ),
  repositories: z.array(
    z.object({
      name: z.string(),
      fullName: z.string(),
      description: optionalText,
      isPrivate: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  ),
});

export const publicProfileRoute = anonymousV1Route({
  method: "get",
  path: "/api-gateway/v1/social/profile",
  summary: "Read a public user profile",
  description:
    "Profile, activities, and repositories by username. Authenticated self-views retain existing private-repository/activity enrichment and follow status; other views use the public client. Activity/repository lists retain the existing 20/50 limits and fallback behavior.",
  query: publicProfileQuery,
  responses: { 200: json("Public profile", publicProfile) },
  handler: async ({ layers }, { query, identity }) =>
    layers.services.userProfile.getUserProfile(
      query.username,
      identity?.userId,
    ),
});
