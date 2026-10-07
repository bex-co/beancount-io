/**
 * URL of a beancount.io documentation page in the reader's language.
 *
 * The docs site serves English at the root and every other dashboard language
 * under a `/<language>` prefix, so a link built without the prefix lands a
 * non-English reader on the English page.
 */
export function docsUrl(language: string, path: string): string {
  const localePrefix = language === "en" ? "" : `/${language}`;
  return `https://beancount.io${localePrefix}/docs/${path}`;
}
