import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { useTranslations } from "../use-translations";

/**
 * A plural message's count printed `String(n)`, so Persian pages read
 * "ردیف‌ها: 58" and "انواع: 12" among Persian digits (w2/125). The real
 * catalogs and i18next run here.
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

function RowCount({ count }: { count: number }) {
  const { t } = useTranslations();
  return <p>{t("page.gallery.ledgersFound", { count })}</p>;
}

async function renderIn(language: string, count: number) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <RowCount count={count} />
    </LocalizationProvider>,
  );
}

describe("plural counts in the language's digits", () => {
  it("writes a Persian count in Persian digits, grouped", async () => {
    await renderIn("fa", 1044);
    expect(screen.getByText(/۱٬۰۴۴/)).toBeInTheDocument();
  });

  it("still picks the plural form from the number", async () => {
    await renderIn("en", 1);
    expect(screen.getByText("1 ledger found")).toBeInTheDocument();
  });

  it("groups an English count", async () => {
    await renderIn("en", 1044);
    expect(screen.getByText("1,044 ledgers found")).toBeInTheDocument();
  });
});
