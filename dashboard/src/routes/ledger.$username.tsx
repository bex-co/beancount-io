import { createFileRoute } from "@tanstack/react-router";
import UserProfilePage from "@/features/user-profile/pages/user-profile-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { userProfileSearchSchema } from "@/features/user-profile/lib/search";

export const Route = createFileRoute("/ledger/$username")({
  component: UserProfilePage,
  validateSearch: (search) => userProfileSearchSchema.parse(search),
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.userProfile.title",
        "seo.userProfile.description",
        {
          username: params.username,
        },
      ),
    ),
});
