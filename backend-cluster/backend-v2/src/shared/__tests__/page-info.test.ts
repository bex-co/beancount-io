import { numberedPage, offsetPage } from "../page-info";

describe("offsetPage", () => {
  it("is exact when the total is known", () => {
    expect(
      offsetPage({ returned: 20, offset: 0, limit: 20, total: 45 }),
    ).toEqual({
      returned: 20,
      limit: 20,
      offset: 0,
      total: 45,
      hasMore: true,
      nextOffset: 20,
    });
    // The last page ends exactly at the total: nothing more, no next position.
    expect(
      offsetPage({ returned: 5, offset: 40, limit: 20, total: 45 }),
    ).toEqual({
      returned: 5,
      limit: 20,
      offset: 40,
      total: 45,
      hasMore: false,
    });
    expect(
      offsetPage({ returned: 20, offset: 25, limit: 20, total: 45 }).hasMore,
    ).toBe(false);
  });

  it("reports an empty read as complete", () => {
    expect(offsetPage({ returned: 0, total: 0 })).toEqual({
      returned: 0,
      offset: 0,
      total: 0,
      hasMore: false,
    });
  });

  it("trusts a truncated flag when there is no total", () => {
    expect(
      offsetPage({ returned: 200, offset: 0, truncated: true }),
    ).toMatchObject({
      hasMore: true,
      nextOffset: 200,
    });
    expect(
      offsetPage({ returned: 3, offset: 0, truncated: false }).hasMore,
    ).toBe(false);
  });
});

describe("numberedPage", () => {
  it("treats a full page as possibly followed by another", () => {
    expect(numberedPage({ returned: 30, page: 2, limit: 30 })).toEqual({
      returned: 30,
      limit: 30,
      page: 2,
      hasMore: true,
      nextPage: 3,
    });
  });

  it("ends on a short page, and on a read with no page size", () => {
    expect(numberedPage({ returned: 12, page: 3, limit: 30 }).hasMore).toBe(
      false,
    );
    expect(numberedPage({ returned: 12 })).toEqual({
      returned: 12,
      page: 1,
      hasMore: false,
    });
  });
});
