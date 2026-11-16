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
  it("sends the file editor without a path to the Files tab for its session", () => {
    const source = read("src/screens/ledger-file-editor-screen/index.tsx");
    const screen = source.slice(
      source.indexOf("export function LedgerFileEditorScreen("),
      source.indexOf("function LedgerFileEditorSession("),
    );
    expect(screen.includes("path?: string")).toBe(true);
    expect(screen.includes("if (!path)")).toBe(true);
    expect(
      guardsBefore(
        screen,
        'href={guest ? "/examples/(tabs)/ledger" : "/(app)/(tabs)/ledger"}',
        "<LedgerFileEditorSession",
      ),
    ).toBe(true);
  });

  // w21/198: a repeated query parameter (`?path=a&path=b`) reaches a screen as
  // `string[]`, and `.split`/`.trim` on it crashed three link-reachable
  // screens. Every route reads its params through `useRouteParams`.
  it("reads every route's params through useRouteParams", () => {
    const walk = (dir: string): string[] =>
      fs
        .readdirSync(path.join(MOBILE_ROOT, dir), { withFileTypes: true })
        .flatMap((entry) => {
          const rel = path.join(dir, entry.name);
          if (entry.isDirectory())
            return entry.name === "__tests__" ? [] : walk(rel);
          return /\.tsx?$/.test(entry.name) ? [rel] : [];
        });
    const direct = [...walk("src"), ...walk("app")].filter((file) =>
      read(file).includes("useLocalSearchParams"),
    );
    // The hook itself, and the OAuth callback screen, which reads every
    // value as `string | string[]` already.
    expect(direct.sort()).toEqual(
      [
        "src/screens/oauth-callback-screen/oauth-callback-screen.tsx",
        "src/common/hooks/use-route-params.ts",
      ].sort(),
    );
  });
});

// w21/199: a Files link to a ledger the user cannot read opened the *selected*
// ledger's same-named file, editable. The editor binds its route to a ledger.
describe("the file editor's ledger binding", () => {
  const compact = (file: string) => read(file).replace(/\s+/g, "");

  it("shows the unavailable state for another ledger's file, sending no request", () => {
    const editor = compact("src/screens/ledger-file-editor-screen/index.tsx");
    expect(editor.includes("bindRouteLedger(ledger,ledgerId)")).toBe(true);
    expect(
      guardsBefore(
        editor,
        'if(binding.status==="mismatch"){',
        "<LedgerFileEditorSessionkey=",
      ),
    ).toBe(true);
    expect(editor.includes('message={t("fileEditorUnavailable")}')).toBe(true);
  });

  it("is passed the ledger by every in-app way into the editor", () => {
    for (const [file, snippet] of [
      [
        "src/screens/ledger-file-browser-screen/index.tsx",
        "params:{path:routeText(createdPath),ledger:ledgerId}",
      ],
      [
        "src/screens/ledger-file-browser-screen/index.tsx",
        "params:{path:routeText(entry.path),ledger:ledgerId}",
      ],
      [
        "src/screens/transaction-detail-screen/transaction-detail-screen.tsx",
        'path:routeText(error.filename??""),ledger:ledgerId,',
      ],
      [
        "src/screens/notifications-screen/notifications-screen.tsx",
        "path:routeText(err.filename!),ledger:ledgerId,",
      ],
    ]) {
      expect(compact(file).includes(snippet)).toBe(true);
    }
  });
});
