/** Stand-in for `@/translations`: an i18n whose output shows what it was asked. */
export const i18n = {
  locale: "en",
  t(key: string, params?: Record<string, unknown>): string {
    return `${key}|${this.locale}|${JSON.stringify(params ?? null)}`;
  },
};
