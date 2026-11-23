/**
 * Run with an existing Playwright page and a dashboard Documents URL:
 *   await documentsMetadataLayout(page, { url });
 * The document list comes from a synthetic GraphQL response.
 */
export default async function documentsMetadataLayout(page, { url }) {
  const documentsUrl = new URL(url);
  documentsUrl.searchParams.set("lang", "en");
  const filename = "qa-20261118/docs/qa-20261118-statement.txt";
  const account = "Assets:Qa20261118:Fifo";
  const documents = [
    { date: "2026-05-03", meta: null, tags: [], links: [] },
    {
      date: "2026-05-04",
      meta: { source: "qa-20261118 broker" },
      tags: ["statement"],
      links: ["may"],
    },
    {
      date: "2026-05-06",
      meta: {
        "statement-date": "2026-05-06",
        total: "12.50 USD",
        reviewed: true,
        pages: "3",
        "bank-account": "Assets:Qa20261118:Cash",
      },
      tags: [],
      links: [],
    },
  ].map((document) => ({
    __typename: "Document",
    filename,
    account,
    ...document,
  }));

  const mockDocuments = async (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.postDataJSON()?.operationName === "GetLedgerDocuments"
    ) {
      await route.fulfill({
        json: { data: { getLedgerDocuments: documents } },
      });
    } else {
      await route.fallback();
    }
  };

  const results = [];
  await page.route("**/graphql*", mockDocuments);
  try {
    for (const [width, height] of [
      [1440, 1000],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(documentsUrl.href);
      const table = page.getByRole("table", { name: "Documents" });
      await table.getByRole("button", { name: filename }).last().waitFor();
      await page.evaluate(() => document.fonts.ready);

      const geometry = await table.evaluate((element) => ({
        columns: Array.from(
          element.querySelectorAll("th"),
          (cell) => cell.getBoundingClientRect().width,
        ),
        rows: Array.from(
          element.tBodies[0].rows,
          (row) => row.getBoundingClientRect().height,
        ),
        tableWidth: element.getBoundingClientRect().width,
        scrollerWidth: element.parentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
      }));
      const metadata = await table
        .getByRole("row")
        .last()
        .getByRole("cell")
        .last()
        .innerText();
      if (width === 390) {
        await table.getByRole("button", { name: filename }).first().focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(
          () =>
            document.activeElement?.closest('[data-slot="table-container"]')
              ?.scrollLeft > 0,
        );
      }
      results.push({ width, geometry, metadata });
    }
  } finally {
    await page.unroute("**/graphql*", mockDocuments);
  }

  for (const { width, geometry, metadata } of results) {
    const [filenameWidth, accountWidth, dateWidth] = geometry.columns;
    if (
      filenameWidth < 192 ||
      accountWidth < 136 ||
      dateWidth < 96 ||
      geometry.rows.length !== documents.length ||
      geometry.rows[0] > 72 ||
      geometry.rows.some((height) => height > 200) ||
      geometry.tableWidth < 59 * 16 ||
      geometry.pageWidth > width ||
      (width === 1440 && geometry.tableWidth > geometry.scrollerWidth + 1) ||
      (width === 390 && geometry.tableWidth <= geometry.scrollerWidth)
    ) {
      throw new Error(
        `Documents layout at ${width}px: ${JSON.stringify(results)}`,
      );
    }
    const expectedLines = Object.entries(documents[2].meta).map(
      ([key, value]) => `${key}: ${value}`,
    );
    if (metadata.split("\n").join(" ") !== expectedLines.join(" ")) {
      throw new Error(`Documents metadata at ${width}px: ${metadata}`);
    }
  }
  return results;
}
