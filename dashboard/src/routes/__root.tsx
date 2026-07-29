import { createRootRouteWithContext } from "@tanstack/react-router";
import type { RouterContext } from "@/router";
import NotFoundPage from "@/common/root-route/not-found-page";
import ErrorPage from "@/common/root-route/error-page";
import { ShellComponent } from "@/common/root-route/shell-component";
import { RootComponent } from "@/common/root-route/root-component";
import { fetchUserProfile } from "@/common/server-fn";
import i18n from "@/i18n/init";
import { detectLanguage } from "@/i18n/detect-language";

import appCss from "../style.css?inline";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Beancount.io",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/lgasset/favicon.ico",
      },
    ],
    styles: [
      {
        children: appCss,
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
  shellComponent: ShellComponent,
  component: RootComponent,
  beforeLoad: async ({ context }) => {
    // On the server, sync the global i18n singleton to the ?lang= param so that
    // SSR rendering produces the correct language (same param the client reads).
    if (import.meta.env.SSR) {
      const language = detectLanguage();
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
      }
    }

    return {
      userProfile: await fetchUserProfile(context.client),
    };
  },
  loader: ({ context }) => {
    return {
      userProfile: context.userProfile,
    };
  },
});
