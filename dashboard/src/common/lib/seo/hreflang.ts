import { SUPPORTED_LANGUAGES } from "@/i18n/config";

/** Alternate languages describe the stable pathname, never UI-state queries. */
export function createHreflangLinks(pathname: string) {
  const origin = "https://beancount.io";
  return [
    ...SUPPORTED_LANGUAGES.map((language) => {
      const url = new URL(pathname, origin);
      url.searchParams.set("lang", language);
      return { rel: "alternate", hrefLang: language, href: url.toString() };
    }),
    {
      rel: "alternate",
      hrefLang: "x-default",
      href: new URL(pathname, origin).toString(),
    },
  ];
}
