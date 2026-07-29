export interface TranslationEntry {
  message: string;
  description: string;
}

const faGalleryPage: Record<string, TranslationEntry> = {
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
