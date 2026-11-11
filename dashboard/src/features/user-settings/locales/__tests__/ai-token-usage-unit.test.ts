import { describe, expect, it } from "vitest";
import * as locales from "@/i18n/locales";

/**
 * The AI usage card counts tokens, and its plan line says tokens. Japanese
 * and Korean called the same count "requests", overstating a two-million-
 * token allowance as two million requests (w2/124).
 */
const USAGE_KEYS = [
  "userSettings.aiCfoUsage",
  "userSettings.aiCfoUsageCount",
  "userSettings.aiCfoUsageUnlimited",
];
const REQUEST_WORDS = /request|リクエスト|요청|请求|請求|запрос|запит|درخواست/i;

describe("AI usage strings name tokens", () => {
  it.each(Object.entries(locales))(
    "%s does not count requests",
    (_, catalog) => {
      const messages = catalog as Record<string, string>;
      for (const key of USAGE_KEYS) {
        expect(messages[key], key).toBeDefined();
        expect(messages[key], key).not.toMatch(REQUEST_WORDS);
      }
    },
  );
});
