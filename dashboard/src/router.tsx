import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getClient } from "./common/apollo/client";
import { createLocalization } from "./i18n/init";
import { LocalizationProvider } from "./i18n/provider";
import { ApolloProvider } from "@apollo/client/react";

export type { RouterContext } from "@/common/types/router-context";

export function getRouter() {
  const client = getClient();
  const localization = createLocalization();
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    scrollToTopSelectors: ['[data-scroll-restoration-id="ledger-content"]'],
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    context: {
      client,
      localization,
    },
    dehydrate: () => {
      return {
        language: localization.i18n.language,
        translation:
          localization.i18n.language === "en"
            ? undefined
            : (localization.i18n.getResourceBundle(
                localization.i18n.language,
                "translation",
              ) as Record<string, string>),
        apolloState: client.cache.extract() as Record<string, string>,
      };
    },
    hydrate: async (data) => {
      if (data.translation)
        localization.i18n.addResourceBundle(
          data.language,
          "translation",
          data.translation,
        );
      await localization.changeLanguage(data.language);
      client.cache.restore(data.apolloState as Record<string, string>);
    },
    Wrap(props) {
      return (
        <LocalizationProvider localization={localization}>
          <ApolloProvider client={client}>{props.children}</ApolloProvider>
        </LocalizationProvider>
      );
    },
  });

  return router;
}
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
