/**
 * Run with Playwright and a dashboard Query URL for a ledger the reader can open:
 *   await queryHistoryLayout(page, { url });
 * The URL's read-only BQL query produces a history card with both actions.
 */
export default async function queryHistoryLayout(page, { url }) {
  const query =
    "SELECT date, payee, narration, position WHERE account ~ 'Expenses:Food' AND year = 2016 ORDER BY date DESC LIMIT 5";
  const queryUrl = new URL(url);
  queryUrl.searchParams.set("query", query);
  const labels = {
    en: ["Download CSV", "Delete query"],
    de: ["CSV herunterladen", "Abfrage löschen"],
    fa: ["دانلود CSV", "حذف پرسمان"],
  };
  const failures = [];
  for (const width of [1440, 1024, 390, 320]) {
    for (const [language, [exportLabel, deleteLabel]] of Object.entries(
      labels,
    )) {
      queryUrl.searchParams.set("lang", language);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(queryUrl.href);
      const summary = page.locator("summary").filter({ hasText: query });
      const card = summary.locator("xpath=../..");
      const download = card.getByRole("button", {
        name: exportLabel,
        exact: true,
      });
      const remove = card.getByRole("button", {
        name: deleteLabel,
        exact: true,
      });
      await download.waitFor();
      await page.evaluate(() => document.fonts.ready);

      const geometry = await remove.evaluate((button) => {
        const actions = button.parentElement;
        const card = actions.parentElement;
        const summary = card.querySelector("summary");
        const actionBox = actions.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        const overlaps = (box) =>
          box.width > 0 &&
          box.left < actionBox.right &&
          box.right > actionBox.left &&
          box.bottom > actionBox.top &&
          box.top < actionBox.bottom;
        const text = summary.querySelector("pre").firstChild;
        const range = document.createRange();
        let covered = "";
        for (let index = 0; index < text.length; index += 1) {
          range.setStart(text, index);
          range.setEnd(text, index + 1);
          if (overlaps(range.getBoundingClientRect()))
            covered += text.data[index];
        }
        return {
          covered,
          chevronCovered: overlaps(
            summary.querySelector("svg").getBoundingClientRect(),
          ),
          actionsOutside:
            actionBox.left < cardBox.left || actionBox.right > cardBox.right,
          cardOverflow: card.scrollWidth - card.clientWidth,
        };
      });

      if (Object.values(geometry).some(Boolean))
        failures.push({ width, language, geometry });
      if (width <= 390) {
        if (await summary.evaluate((element) => element.parentElement.open)) {
          await summary.press("Enter");
        }
        await summary.focus();
        await page.keyboard.press("Tab");
        const exportFocused = await download.evaluate(
          (button) => button === document.activeElement,
        );
        await page.keyboard.press("Tab");
        const deleteFocused = await remove.evaluate(
          (button) => button === document.activeElement,
        );
        const scrollLeft = await card.evaluate((element) => element.scrollLeft);
        if (!exportFocused || !deleteFocused || scrollLeft !== 0) {
          failures.push({
            width,
            language,
            exportFocused,
            deleteFocused,
            scrollLeft,
          });
        }
      }
    }
  }
  if (failures.length > 0)
    throw new Error(`Query History layout: ${JSON.stringify(failures)}`);
}
