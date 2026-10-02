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
  head: ({
    match,
    matches,
  }: {
    match: { status: string; globalNotFound?: boolean };
    matches: ReadonlyArray<{
      routeId: string;
      status: string;
      globalNotFound?: boolean;
    }>;
  }) => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      // Root 404/error pages supply their own title via PageSEO. The ledger
      // loader error shell only supplies robots, so it keeps this fallback.
      // `matches` is the load's original snapshot; `match` includes a loader's
      // notFound result after it bubbles to the root boundary.
      ...(match.globalNotFound ||
      match.status === "notFound" ||
      match.status === "error" ||
      matches.some(
        (item) =>
          item.globalNotFound ||
          item.status === "notFound" ||
          (item.status === "error" &&
            item.routeId !== "/ledger/$ledgerOwner/$ledgerName"),
      )
        ? []
        : [{ title: "Beancount.io" }]),
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
