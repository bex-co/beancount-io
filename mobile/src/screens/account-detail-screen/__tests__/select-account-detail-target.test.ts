import fs from "fs";
import path from "path";
import { selectAccountDetailTarget } from "../select-account-detail-target";
import { resolveAppLink } from "../../../common/app-links/resolve-app-link";

const LEDGER_A = "alice/a";
const LEDGER_B = "alice/b";

describe("selectAccountDetailTarget", () => {
  it("queries the selected ledger when the route agrees", () => {
    expect(
      selectAccountDetailTarget({
        account: "Assets:Cash",
        ledger: LEDGER_A,
        selectedLedgerId: LEDGER_A,
      }),
    ).toEqual({
      status: "ready",
      account: "Assets:Cash",
      ledgerId: LEDGER_A,
    });
  });

  it("refuses to query when the route belongs to another ledger", () => {
    // Note 122: `openAppLinkTarget` calls `router.replace`, which rewrites only
    // the current entry — older account-detail entries for the previous ledger
    // survive. Reviving one must not query the old account under the new ledger.
    expect(
      selectAccountDetailTarget({
        account: "Assets:A:Cash",
        ledger: LEDGER_A,
        selectedLedgerId: LEDGER_B,
      }),
    ).toEqual({
      status: "mismatch",
      routeLedgerId: LEDGER_A,
      selectedLedgerId: LEDGER_B,
    });
  });

  it("becomes queryable again when the user switches back", () => {
    const entry = { account: "Assets:A:Cash", ledger: LEDGER_A };
    expect(
      selectAccountDetailTarget({ ...entry, selectedLedgerId: LEDGER_B })
        .status,
    ).toBe("mismatch");
    expect(
      selectAccountDetailTarget({ ...entry, selectedLedgerId: LEDGER_A })
        .status,
    ).toBe("ready");
  });

  it("reports a route with no account as unusable", () => {
    expect(
      selectAccountDetailTarget({
        ledger: LEDGER_A,
        selectedLedgerId: LEDGER_A,
      }),
    ).toEqual({ status: "missing" });
    expect(
      selectAccountDetailTarget({
        account: "",
        selectedLedgerId: LEDGER_A,
      }),
    ).toEqual({ status: "missing" });
  });

  it("falls back to the selected ledger when the route carries none", () => {
    // Links written before the param existed (and hand-typed deep links) keep
    // working: there is no other ledger to disagree with.
    expect(
      selectAccountDetailTarget({
        account: "Assets:Cash",
        selectedLedgerId: LEDGER_B,
      }),
    ).toEqual({ status: "ready", account: "Assets:Cash", ledgerId: LEDGER_B });
  });

  it("reads the first value of a repeated param", () => {
    expect(
      selectAccountDetailTarget({
        account: ["Assets:Cash", "Assets:Other"],
        ledger: [LEDGER_A],
        selectedLedgerId: LEDGER_A,
      }),
    ).toEqual({ status: "ready", account: "Assets:Cash", ledgerId: LEDGER_A });
  });
});

describe("account-detail links carry their ledger", () => {
  it("an app link's account href names the link's ledger", () => {
    const target = resolveAppLink(
      "https://beancount.io/ledger/alice/a/account/Assets:Cash",
      { serverUrl: "https://beancount.io" },
    );
    expect(target === null).toBe(false);
    expect(target!.href).toEqual({
      pathname: "/account-detail",
      params: { account: "Assets:Cash", ledger: "alice/a" },
    });
  });

  it("end to end: a revived entry from the other ledger is not queried", () => {
    const target = resolveAppLink(
      "https://beancount.io/ledger/alice/a/account/Assets:A:Cash",
      { serverUrl: "https://beancount.io" },
    );
    const params = (target!.href as { params: Record<string, string> }).params;
    // The user then follows a link into ledger B; Back revives the entry above.
    expect(
      selectAccountDetailTarget({
        account: params.account,
        ledger: params.ledger,
        selectedLedgerId: LEDGER_B,
      }).status,
    ).toBe("mismatch");
  });

  it("every in-app push to /account-detail passes a ledger param", () => {
    // Guardrail: a push without the param silently falls back to the ambient
    // selection, which is exactly the shape note 122 describes.
    const srcDir = path.join(__dirname, "..", "..", "..");
    const collect = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          out.push(...collect(full));
        } else if (
          /\.tsx?$/.test(entry.name) &&
          !/\.test\.tsx?$/.test(entry.name)
        ) {
          out.push(full);
        }
      }
      return out;
    };

    // `pathname: "/account-detail"` followed by a params object on the next
    // lines; the params must mention `ledger`.
    const PUSH =
      /pathname:\s*"\/account-detail",\s*(?:\/\/[^\n]*\n\s*)*params:\s*\{([^}]*)\}/g;
    const offenders: string[] = [];
    for (const file of collect(srcDir)) {
      const source = fs.readFileSync(file, "utf8");
      PUSH.lastIndex = 0;
      let match = PUSH.exec(source);
      while (match !== null) {
        if (!/\bledger\b/.test(match[1])) {
          offenders.push(path.relative(srcDir, file));
        }
        match = PUSH.exec(source);
      }
    }

    expect(offenders.join(", ")).toBe("");
  });
});
