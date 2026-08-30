import { tools } from "../catalog";
import {
  AWESOME_PTA_DESCRIPTION,
  AWESOME_PTA_TITLE,
  AWESOME_PTA_URL,
  CONTRIBUTION_URL,
  buildAwesomePtaStructuredData,
} from "../metadata";

describe("Awesome PTA metadata", () => {
  it("describes the decision resource and every catalog item", () => {
    const data = buildAwesomePtaStructuredData();

    expect(AWESOME_PTA_TITLE).toContain("Plain-Text Accounting Tools");
    expect(AWESOME_PTA_DESCRIPTION).toContain("Compare");
    expect(data.url).toBe(AWESOME_PTA_URL);
    expect(data.numberOfItems).toBe(tools.length);
    expect(data.itemListElement).toHaveLength(tools.length);
    expect(new Set(data.itemListElement.map((item) => item.url)).size).toBe(
      tools.length,
    );
  });

  it("links contributions to a prefilled public issue", () => {
    const url = new URL(CONTRIBUTION_URL);

    expect(url.hostname).toBe("github.com");
    expect(url.pathname).toBe("/bex-co/beancount-io/issues/new");
    expect(url.searchParams.get("title")).toContain(
      "Awesome Plain Text Accounting",
    );
    expect(url.searchParams.get("body")).toContain("Maintenance evidence");
  });
});
