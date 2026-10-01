import { FeedSource } from "../../../../generated-graphql/types";
import { feedSourceLabelKey } from "../feed-logic";

describe("feedSourceLabelKey", () => {
  it("labels every source, with releases no longer read as blog posts", () => {
    expect(feedSourceLabelKey(FeedSource.LedgerRss)).toBe("feedSourceLedger");
    expect(feedSourceLabelKey(FeedSource.Blog)).toBe("feedSourceBlog");
    expect(feedSourceLabelKey(FeedSource.Changelog)).toBe("feedSourceRelease");
  });
});
