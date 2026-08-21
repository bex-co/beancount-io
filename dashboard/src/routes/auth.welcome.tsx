import { createFileRoute } from "@tanstack/react-router";
import WelcomePage from "@/features/ledger-list/pages/welcome-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { welcomeLoader } from "@/features/ledger-list/pages/welcome-page/loader";

export const Route = createFileRoute("/auth/welcome")({
  component: WelcomePage,
  loader: welcomeLoader,
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.welcome.title", "seo.welcome.description"),
      { noIndex: true },
    ),
});
