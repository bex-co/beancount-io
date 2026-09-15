import fs from "fs";
import path from "path";

/**
 * Static guardrail: routes reachable by URL do not dereference a param only
 * their in-app caller supplies. Opened as `beancount:///(app)/<route>` with no
 * params, both of these crashed on `undefined.split`; each now redirects
 * before rendering the screen that needs the param.
 */
const MOBILE_ROOT = path.join(__dirname, "..", "..");
const read = (file: string) =>
  fs.readFileSync(path.join(MOBILE_ROOT, file), "utf8");

const guardsBefore = (source: string, guard: string, render: string) => {
  const at = source.indexOf(guard);
  return at !== -1 && at < source.indexOf(render);
};

describe("route param guards", () => {
  it("sends add-transaction-next without an amount to the live add flow", () => {
    const source = read("app/(app)/add-transaction-next.tsx");
    expect(source.includes("currentMoney?: string")).toBe(true);
    expect(
      guardsBefore(
        source,
        '<Redirect href="/add-transaction" />',
        "<AddTransactionNextScreen />",
      ),
    ).toBe(true);
  });

  it("sends the file editor without a path to the Files tab", () => {
    const source = read("src/screens/ledger-file-editor-screen/index.tsx");
    const screen = source.slice(
      source.indexOf("export function LedgerFileEditorScreen("),
      source.indexOf("function LedgerFileEditorSession("),
    );
    expect(screen.includes("path?: string")).toBe(true);
    expect(
      guardsBefore(
        screen,
        '<Redirect href="/(app)/(tabs)/ledger" />',
        "<LedgerFileEditorSession",
      ),
    ).toBe(true);
  });
});
