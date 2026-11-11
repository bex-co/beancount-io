export interface TranslationEntry {
  message: string;
  description: string;
}

const faGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "حداقل ۲ کاراکتر برای جستجو تایپ کنید.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "هیچ دفتری با {query} مطابقت ندارد",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "{count} دفتر یافت شد",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "{count} دفتر یافت شد",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "نمایش {count} دفتر نخست — دفترهای بیشتری موجود است",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message: "نمایش {count} دفتر نخست — دفترهای بیشتری موجود است",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "نمایش دفترهای بیشتر",
    description: "Button that loads the next page of ledger search results",
  },
  "page.gallery.failedToSearchLedgers": {
    message: "جستجوی دفاتر ناموفق بود",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "گالری دفاتر",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "تمام دفاتر موجود را کشف و بررسی کنید. برای یافتن سریع و مراجعه به هر دفتر، بر اساس نام جستجو کنید.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "دفتری یافت نشد",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message: "جستجو و مراجعه به دفاتر. حداقل ۲ کاراکتر برای جستجو تایپ کنید.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "برای یافتن دفاتر بیشتر، عبارت جستجو را تغییر دهید.",
    description: "Suggestion to adjust search query",
  },
};

export default faGalleryPage;
