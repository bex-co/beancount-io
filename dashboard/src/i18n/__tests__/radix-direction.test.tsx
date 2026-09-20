import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useDirection } from "@radix-ui/react-direction";
import { Tabs, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { createLocalization } from "../init";
import { LocalizationProvider } from "../provider";

/**
 * Radix decides arrow-key order — and writes `dir` onto its own root — from
 * `useDirection()`, which falls back to "ltr" whenever no DirectionProvider
 * sits above it. Without one, a tab list rendered left-to-right inside a
 * right-to-left page and its keyboard order followed suit, disagreeing with
 * the document the rest of the app lays out from.
 */

vi.unmock("react-i18next");

function ReportedDirection() {
  return <span data-testid="direction">{useDirection()}</span>;
}

async function renderIn(language: string) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <ReportedDirection />
      <Tabs value="a">
        <TabsList>
          <TabsTrigger value="a">first</TabsTrigger>
          <TabsTrigger value="b">second</TabsTrigger>
        </TabsList>
      </Tabs>
    </LocalizationProvider>,
  );
  return localization;
}

describe("Radix reads the document's reading direction", () => {
  it("reports rtl for a right-to-left language", async () => {
    const localization = await renderIn("fa");

    expect(localization.i18n.dir()).toBe("rtl");
    expect(screen.getByTestId("direction")).toHaveTextContent("rtl");
  });

  it("puts that direction on the tab list Radix renders", async () => {
    await renderIn("fa");

    // Radix writes the resolved direction onto its root; when it resolved ltr
    // it forced the list left-to-right inside an rtl page.
    expect(screen.getByRole("tablist").closest("[dir]")).toHaveAttribute(
      "dir",
      "rtl",
    );
  });

  it("still reports ltr for a left-to-right language", async () => {
    const localization = await renderIn("en");

    expect(localization.i18n.dir()).toBe("ltr");
    expect(screen.getByTestId("direction")).toHaveTextContent("ltr");
  });

  it("follows a language change rather than the direction at mount", async () => {
    const localization = createLocalization();
    const { rerender } = render(
      <LocalizationProvider localization={localization}>
        <ReportedDirection />
      </LocalizationProvider>,
    );
    expect(screen.getByTestId("direction")).toHaveTextContent("ltr");

    await localization.changeLanguage("fa");
    rerender(
      <LocalizationProvider localization={localization}>
        <ReportedDirection />
      </LocalizationProvider>,
    );

    expect(screen.getByTestId("direction")).toHaveTextContent("rtl");
  });
});
