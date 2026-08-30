import { createFileRoute } from "@tanstack/react-router";
import AwesomePlainTextAccountingPage from "@/features/awesome-plain-text-accounting/page";
import {
  AWESOME_PTA_DESCRIPTION,
  AWESOME_PTA_TITLE,
  AWESOME_PTA_URL,
  buildAwesomePtaStructuredData,
} from "@/features/awesome-plain-text-accounting/metadata";

export const Route = createFileRoute("/awesome-plain-text-accounting")({
  component: AwesomePlainTextAccountingPage,
  head: () => ({
    meta: [
      { title: AWESOME_PTA_TITLE },
      { name: "description", content: AWESOME_PTA_DESCRIPTION },
      { property: "og:title", content: AWESOME_PTA_TITLE },
      { property: "og:description", content: AWESOME_PTA_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: AWESOME_PTA_URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: AWESOME_PTA_TITLE },
      { name: "twitter:description", content: AWESOME_PTA_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: AWESOME_PTA_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildAwesomePtaStructuredData()),
      },
    ],
  }),
});
