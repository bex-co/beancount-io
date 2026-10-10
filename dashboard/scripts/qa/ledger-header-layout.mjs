/**
 * Run with an existing Playwright page and a signed-in read-only context:
 *   await ledgerHeaderLayout(page, { baseURL: "http://localhost:5173" });
 *
 * Uses the public example ledger and native keyboard interactions. This
 * browser QA scenario needs a running dashboard; Vitest covers the emitted
 * container CSS and filter-sheet behavior separately, without a layout engine.
 */
export default async function ledgerHeaderLayout(page, { baseURL }) {
  const results = [];
  const storageState = await page.context().storageState();
  for (const [width, language] of [
    [1024, "de"],
    [1024, "en"],
    [1100, "de"],
    [1440, "de"],
  ]) {
    const context = await page
      .context()
      .browser()
      .newContext({
        viewport: { width, height: 1000 },
        storageState,
      });
    const tab = await context.newPage();
    try {
      const url = new URL(
        "/ledger/open_ledger/crypto-example/statistics",
        baseURL,
      );
      url.searchParams.set("time", "2026");
      url.searchParams.set("lang", language);
      await tab.goto(url.href);
      await tab
        .getByRole("cell", { name: "Transaction", exact: true })
        .waitFor();
      // Require the authenticated action group that originally overflowed.
      await tab
        .getByRole("button", {
          name: language === "de" ? "Benutzermenü" : "User menu",
          exact: true,
        })
        .waitFor();
      await tab.waitForTimeout(800);
      const phases = [];
      for (const phase of ["expanded", "collapsed", "restored"]) {
        if (phase !== "expanded") {
          await tab.keyboard.press("ControlOrMeta+b");
          await tab.waitForTimeout(700);
        }
        const geometry = await tab
          .locator("header")
          .first()
          .evaluate((header) => ({
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            headerWidth: header.getBoundingClientRect().width,
            contentWidth: header.scrollWidth,
            scrollX,
            buttons: [...header.querySelectorAll("button")]
              .filter(
                (button) =>
                  button.getClientRects().length > 0 &&
                  getComputedStyle(button).visibility !== "hidden",
              )
              .map((button) => ({
                name: button.getAttribute("aria-label") || button.textContent,
                left: button.getBoundingClientRect().left,
                right: button.getBoundingClientRect().right,
              })),
          }));
        if (
          geometry.documentWidth > width ||
          geometry.contentWidth > geometry.headerWidth ||
          geometry.scrollX !== 0 ||
          geometry.buttons.some(
            (button) => button.left < 0 || button.right > width,
          )
        ) {
          throw new Error(
            `Header overflow: ${language}/${width}/${phase}: ${JSON.stringify(geometry)}`,
          );
        }
        const filters = tab.getByRole("button", {
          name: language === "de" ? "Filter" : "Filters",
          exact: true,
        });
        const sheetExpected = width === 1024 && phase !== "collapsed";
        if ((await filters.isVisible()) !== sheetExpected) {
          throw new Error(`Wrong filter mode: ${language}/${width}/${phase}`);
        }
        if (new URL(tab.url()).searchParams.get("time") !== "2026") {
          throw new Error(`Period lost: ${language}/${width}/${phase}`);
        }
        phases.push({ phase, geometry });
      }
      results.push({ width, language, phases });
    } finally {
      await context.close();
    }
  }
  return results;
}
