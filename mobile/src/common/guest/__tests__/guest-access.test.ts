import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// Execute the actual guard and permission hook, substituting only React/native
// hosts and query results. A former account's writable cache is deliberately
// present while the guest views mount.
let guest: { ledgerId: string } | null = { ledgerId: "open_ledger/example" };
let listReads = 0;
let permissionSkip = false;
const react = {
  createContext: () => ({ Provider: "Provider" }),
  createElement: (type: any, props: any, ...children: unknown[]): any =>
    typeof type === "function"
      ? type({ ...props, children })
      : { type, props, children },
  memo: (component: unknown) => component,
  useEffect() {},
};
function load(file: string): any {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(__dirname, file), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      React: react,
      require(id: string) {
        if (id === "react") return react;
        if (id === "react-native")
          return {
            StyleSheet: { create: (value: unknown) => value },
            View: "View",
            Text: "Text",
          };
        if (id === "@apollo/client")
          return { useReactiveVar: (read: () => unknown) => read() };
        if (id === "@/common/vars")
          return {
            ledgerVar: () => "previous/private",
            sessionVar: () => null,
          };
        if (id === "@/common/guest/guest-context")
          return { useGuest: () => guest };
        if (id === "@/common/ledger-access")
          return require("../../ledger-access");
        if (id === "@/generated-graphql/graphql")
          return {
            useListLedgersQuery: () => {
              listReads += 1;
              return {};
            },
            useGetLedgerQuery: (options: { skip: boolean }) => {
              permissionSkip = options.skip;
              return {
                data: {
                  getLedger: {
                    id: "previous/private",
                    permissions: { push: true, admin: true },
                  },
                },
              };
            },
          };
        if (id === "expo-router")
          return { useRouter: () => ({}), Redirect: "Redirect" };
        if (id === "@/common/rtl")
          return { directionalIcon: (name: string) => name };
        if (id === "@/common/theme")
          return { useTheme: () => ({ colorTheme: {} }) };
        if (id === "@/common/hooks")
          return { useThemeStyle: (fn: any) => fn({}) };
        if (id === "@/common/hooks/use-translations")
          return { useTranslations: () => ({ t: (key: string) => key }) };
        if (id === "@expo/vector-icons") return {};
        if (id === "@/components/stack-back-button")
          return { StackBackButton: "Back" };
        if (id === "@/common/ledger-directory/ledger-directory-provider")
          return {
            LedgerDirectoryProvider: () => {
              throw new Error("Guest must not mount an account directory");
            },
          };
        throw new Error(`Unexpected dependency: ${id}`);
      },
    },
  );
  return exports;
}
const { LedgerGuard } = load(
  "../../../components/ledger-guard/ledger-guard.tsx",
);
const { useLedgerAccess } = load("../../hooks/use-ledger-access.ts");
const { default: AppLayout } = load("../../../../app/(app)/_layout.tsx");

describe("guest guards with a previously authenticated cache", () => {
  afterEach(() => {
    guest = { ledgerId: "open_ledger/example" };
  });
  it("provides only the selected example and does not list an account's ledgers", () => {
    listReads = 0;
    const tree = LedgerGuard({ children: "public reports" });
    expect(tree.props.value.ledgerId).toBe("open_ledger/example");
    expect(listReads).toBe(0);
  });
  it("skips the previous ledger permission query and refuses its cached write grant", () => {
    expect(useLedgerAccess().canWrite).toBe(false);
    expect(permissionSkip).toBe(true);
  });
  it("keeps the existing signed-in write permission behavior", () => {
    guest = null;
    expect(useLedgerAccess().canWrite).toBe(true);
    expect(permissionSkip).toBe(false);
  });
  it("redirects the protected route layout to Welcome even with a selected guest ledger", () => {
    const tree = AppLayout();
    expect(tree.type).toBe("Redirect");
    expect(tree.props.href).toBe("/auth/welcome");
  });
});
