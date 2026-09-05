import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    throw redirect({
      to: context.userProfile ? "/auth/welcome" : "/auth/login",
    });
  },
  head: ({ match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.home.title",
        "seo.home.description",
      ),
    ),
});
