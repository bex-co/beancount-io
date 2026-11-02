import fs from "fs";
import path from "path";
import { resolveServerLink } from "../server-link";

const HOSTED = "https://beancount.io/";
const SELF = "https://books.example.test/";
const JOURNAL = "https://beancount.io/ledger/bob/household/journal";

describe("a link while a server is selected (w21/348)", () => {
  it("a beancount.io link goes to the browser on a self-hosted server", () => {
    expect(resolveServerLink(JOURNAL, SELF)).toEqual({
      kind: "browser",
      url: JOURNAL,
    });
  });

  it("opens on the hosted server and for the self-hosted server's own host", () => {
    const hosted = resolveServerLink(JOURNAL, HOSTED);
    expect(hosted.kind).toBe("open");
    const own = resolveServerLink(
      "https://books.example.test/ledger/bob/household/journal",
      SELF,
    );
    expect(own.kind).toBe("open");
  });

  it("a hostless link means the selected server", () => {
    for (const incoming of [
      "/ledger/bob/household/journal",
      "beancount:///ledger/bob/household/journal",
    ]) {
      const link = resolveServerLink(incoming, SELF);
      expect(link.kind).toBe("open");
      expect(link.kind === "open" && link.url).toBe(
        "https://books.example.test/ledger/bob/household/journal",
      );
    }
  });

  it("ignores links that are not ledger links, and other hosts", () => {
    expect(resolveServerLink("https://evil.example/ledger/a/b", SELF)).toEqual({
      kind: "ignore",
    });
    expect(resolveServerLink("https://beancount.io/pricing", SELF)).toEqual({
      kind: "ignore",
    });
  });

  it("the link handler opens the browser and clears the stash", () => {
    const src = fs
      .readFileSync(path.join(__dirname, "../use-app-link-handler.ts"), "utf8")
      .replace(/\s+/g, "");
    expect(
      src.includes(
        'if(link.kind==="browser"){clearPendingAppLink();awaitRnLinking.openURL(withAppMarker(link.url)).catch(()=>undefined);return;}',
      ),
    ).toBe(true);
  });
});
