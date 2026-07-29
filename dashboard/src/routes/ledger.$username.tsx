import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import UserProfilePage from "@/features/user-profile/pages/user-profile-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const userProfileSearchSchema = z.object({
  tab: z.enum(["overview", "starred", "following", "followers"]).optional(),
});

export const Route = createFileRoute("/ledger/$username")({
  component: UserProfilePage,
  validateSearch: userProfileSearchSchema,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata("seo.userProfile.title", "seo.userProfile.description", {
        username: params.username,
      }),
    ),
});
