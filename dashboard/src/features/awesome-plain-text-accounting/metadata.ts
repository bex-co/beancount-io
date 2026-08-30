import { CATALOG_REVIEWED_ON, tools } from "./catalog";

export const AWESOME_PTA_URL =
  "https://beancount.io/awesome-plain-text-accounting";
export const AWESOME_PTA_TITLE =
  "Plain-Text Accounting Tools: Beancount, hledger & More";
export const AWESOME_PTA_DESCRIPTION =
  "Compare maintained plain-text accounting engines, editors, importers, reports, and mobile tools. Choose a Beancount, hledger, or Ledger stack.";

export const CONTRIBUTION_URL =
  "https://github.com/bex-co/beancount-io/issues/new?title=Awesome%20Plain%20Text%20Accounting%3A%20add%20or%20update%20a%20tool&body=Tool%20name%3A%0AProject%20URL%3A%0ASupported%20format%3A%0ABest%20for%3A%0AMaintenance%20evidence%3A%0AWhy%20it%20belongs%20in%20the%20directory%3A";

export function buildAwesomePtaStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: AWESOME_PTA_TITLE,
    description: AWESOME_PTA_DESCRIPTION,
    url: AWESOME_PTA_URL,
    dateModified: CATALOG_REVIEWED_ON,
    numberOfItems: tools.length,
    itemListElement: tools.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.name,
      url: tool.href,
    })),
  };
}
