import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import WelcomePage from "@/features/ledger-list/pages/welcome-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { welcomeLoader } from "@/features/ledger-list/pages/welcome-page/loader";

export const Route = createFileRoute("/auth/welcome")({
  validateSearch: z.object({
    oauthUid: z.string().optional(),
    oauthScope: z.string().optional(),
  }),
  loaderDeps: ({ search }) => search,
  component: WelcomePage,
  loader: welcomeLoader,
  head: ({ match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.welcome.title",
        "seo.welcome.description",
      ),
      { noIndex: true },
    ),
});
