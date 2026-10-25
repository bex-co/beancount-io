import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as names from "../ledger-name";

// Run the real submission handler, replacing only UI/form hosts and its IO.
function screen(
  refreshFails: boolean,
  here = true,
  older: { startKind?: string } | false = false,
) {
  const events: string[] = [];
  let submit: () => Promise<void> = async () => {};
  const created = {
    id: "new",
    name: "new",
    fullName: "owner/new",
    private: true,
  };
  const react = {
    createElement: () => null,
    useMemo: (fn: () => unknown) => fn(),
    useEffect: () => {},
    useState: (initial: unknown) => [
      typeof initial === "function" ? (initial as () => unknown)() : initial,
      () => {},
    ],
    useRef: (initial: unknown) => ({ current: initial }),
  };
  const exports: { CreateLedgerScreen?: () => void } = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../create-ledger-screen.tsx"),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.React,
        },
      },
    ).outputText,
    {
      exports,
      React: react,
      require(id: string): any {
        if (id === "react") return react;
        if (id === "react-native")
          return {
            Platform: { OS: "ios" },
            StyleSheet: { create: (x: unknown) => x },
          };
        if (id === "react-native-safe-area-context") return {};
        if (id === "expo-router")
          return {
            Stack: { Screen: "Screen" },
            router: {
              replace: () => events.push("navigate"),
              dismissTo: () => events.push("navigate"),
            },
          };
        if (id === "zod") return require("zod");
        if (id === "@hookform/resolvers/zod")
          return { zodResolver: () => null };
        if (id === "react-hook-form")
          return {
            useForm: () => ({
              handleSubmit: (fn: (values: unknown) => Promise<void>) => {
                submit = () =>
                  fn({
                    name: "new",
                    description: "",
                    private: true,
                    template: "STARTER",
                    currency: "USD",
                    historyStart: "2026-01-01",
                    openingAccount: "",
                    openingAmount: "",
                  });
                return submit;
              },
              setError: () => events.push("form-error"),
              reset: () => {},
              getValues: () => ({
                name: "new",
                description: "",
                private: true,
                template: "STARTER",
                currency: "USD",
                historyStart: "2026-01-01",
                openingAccount: "",
                openingAmount: "",
              }),
              trigger: async () => true,
              watch: (field?: string) =>
                field
                  ? "new"
                  : {
                      name: "new",
                      description: "",
                      private: true,
                      template: "STARTER",
                      currency: "USD",
                      historyStart: "2026-01-01",
                      openingAccount: "",
                      openingAmount: "",
                    },
              formState: { errors: {}, isSubmitting: false },
            }),
          };
        if (id === "@/common/create-ledger-draft")
          return {
            CREATE_LEDGER_DRAFT_KEY: "create-ledger-draft",
            clearCreateLedgerDraft: async () => undefined,
            restoreCreateLedgerDraft: () => null,
            serializeCreateLedgerDraft: () => "{}",
          };
        if (id === "@react-native-async-storage/async-storage")
          return {
            getItem: async () => null,
            setItem: async () => {},
            removeItem: async () => {},
          };
        if (id === "expo-localization")
          return { getLocales: () => [{ regionCode: "US" }] };
        if (id === "./revalidate-on-edit")
          return require("../revalidate-on-edit");
        if (id === "./setup-presets")
          return {
            SETUP_PRESETS: [
              { id: "PERSONAL", titleKey: "t", outcomeKey: "o", accounts: [] },
            ],
            suggestCurrency: () => "USD",
            defaultHistoryStart: () => "2026-10-20",
            openingAmountValue: (value: string) => value.trim(),
            openingSelection: () => null,
          };
        if (id === "@/generated-graphql/graphql")
          return {
            LedgerTemplate: { Sample: "SAMPLE" },
            LedgerSetupPreset: { Personal: "PERSONAL" },
            LedgerOpeningState: { Known: "KNOWN" },
            usePreviewLedgerSetupLazyQuery: () => [
              async () => ({ data: undefined }),
              { data: undefined, loading: false, error: undefined },
            ],
            useCreateLedgerMutation: () => [
              async () => {
                if (older) {
                  events.push("rejected");
                  throw Object.assign(new Error("Unknown argument"), {
                    graphQLErrors: [
                      {
                        message:
                          'Unknown argument "setup" on field createLedger',
                        extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
                      },
                    ],
                  });
                }
                events.push("created");
                return { data: { createLedger: created } };
              },
              { loading: false },
            ],
            useCreateLedgerBasicMutation: () => [
              async (options: { variables: Record<string, unknown> }) => {
                events.push(
                  `basic:${Object.keys(options.variables).sort().join(",")}`,
                );
                return { data: { createLedger: created } };
              },
              { loading: false },
            ],
          };
        if (id === "@/common/ledger-directory/ledger-directory-provider")
          return {
            useLedgerDirectory: () => ({
              ledgers: [],
              loading: false,
              refresh: async (value: unknown) => {
                expect(value).toEqual(created);
                events.push("refresh-start");
                await Promise.resolve();
                events.push("refresh-settled");
                if (refreshFails) throw new Error("offline");
              },
            }),
          };
        if (id === "@/common/graphql-unsupported")
          return require("../../../common/graphql-unsupported");
        if (id === "@/common/hooks/use-toast")
          return {
            useToast: () => ({ showToast: () => events.push("toast") }),
          };
        if (id === "@/common/hooks/use-is-here")
          return { useIsHere: () => () => here };
        if (id === "@/common/hooks/use-theme-style")
          return { useThemeStyle: () => ({}) };
        if (id === "@/common/hooks/use-translations")
          return { useTranslations: () => ({ t: (key: string) => key }) };
        if (id === "@/common/theme")
          return { useTheme: () => ({ colorTheme: {} }) };
        if (id === "@/common/content-column") return { contentColumn: {} };
        if (id === "@/common/vars")
          return { ledgerVar: () => events.push("select") };
        if (id === "@/common/rtl") return {};
        if (id === "./ledger-name") return names;
        if (id === "@/components/inline-error")
          return { InlineError: () => null };
        if (id === "@/components/card-load-failure")
          return { CardLoadFailure: () => null };
        throw new Error(`Unexpected dependency: ${id}`);
      },
    },
  );
  exports.CreateLedgerScreen!();
  return { submit, events };
}

describe("ledger creation directory refresh", () => {
  for (const fails of [false, true]) {
    it(`waits for directory refresh before navigation; refresh failure=${fails} does not offer a duplicate creation`, async () => {
      const { submit, events } = screen(fails);
      await submit();
      expect(events).toEqual([
        "created",
        "refresh-start",
        "refresh-settled",
        "select",
        "navigate",
      ]);
    });
  }

  // w21/579: the user went Back while the create ran. The ledger exists, and
  // that is all the toast says; nothing is switched and nothing is popped.
  it("only toasts when the user left meanwhile", async () => {
    const { submit, events } = screen(false, false);
    await submit();
    expect(events).toEqual([
      "created",
      "refresh-start",
      "refresh-settled",
      "toast",
    ]);
  });

  // w21/592: a server older than guided setup rejects `setup` and `requestId`
  // before anything runs. Starter and Sample still create without them.
  it("creates a Starter ledger on a server that rejects the new arguments", async () => {
    const { submit, events } = screen(false, true, {});
    await submit();
    expect(events).toEqual([
      "rejected",
      "basic:description,name,private",
      "refresh-start",
      "refresh-settled",
      "select",
      "navigate",
    ]);
  });
});
