import { createRootRouteWithContext } from "@tanstack/react-router";
import type { RouterContext } from "@/router";
import NotFoundPage from "@/common/root-route/not-found-page";
import ErrorPage from "@/common/root-route/error-page";
import { ShellComponent } from "@/common/root-route/shell-component";
import { RootComponent } from "@/common/root-route/root-component";
import { fetchUserProfile } from "@/common/server-fn";
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
    // The router owns this instance. Complete translations before route heads
    // and SSR render; hydration awaits the same locale before rendering.
    const userProfile = fetchUserProfile(context.client);
    if (import.meta.env.SSR) {
      await context.localization.changeLanguage(detectLanguage());
    }

    return {
      userProfile: await userProfile,
    };
  },
  loader: ({ context }) => {
    return {
      userProfile: context.userProfile,
    };
  },
});
