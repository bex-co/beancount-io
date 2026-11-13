import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as names from "../ledger-name";
import * as currency from "../ledger-currency";
import * as unsupported from "../../../common/graphql-unsupported";

type Values = { template: "STARTER" | "SAMPLE"; currency: string };

// Run the real submission handler, replacing only UI/form hosts and its IO.
function screen(
  refreshFails: boolean,
  here = true,
  {
    values = { template: "STARTER", currency: "USD" } as Values,
    olderServer = false,
  } = {},
) {
  const events: string[] = [];
  const sent: { document: string; variables: unknown }[] = [];
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
            router: { dismissTo: () => events.push("navigate") },
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
                    ...values,
                  });
                return submit;
              },
              setError: (field: string) => events.push(`form-error:${field}`),
              setValue: () => {},
              getFieldState: () => ({ isDirty: false }),
              trigger: async () => true,
              watch: () => "new",
              formState: { errors: {}, isSubmitting: false },
            }),
          };
        if (id === "@/generated-graphql/graphql")
          return {
            LedgerTemplate: { Sample: "SAMPLE" },
            useCreateLedgerMutation: () => [
              async ({ variables }: { variables: object }) => {
                // Copied out of the sandbox's realm, so deep equality holds.
                sent.push({
                  document: "CreateLedger",
                  variables: { ...variables },
                });
                events.push("created");
                return { data: { createLedger: created } };
              },
              { loading: false },
            ],
            useCreateLedgerInCurrencyMutation: () => [
              async ({ variables }: { variables: object }) => {
                sent.push({
                  document: "CreateLedgerInCurrency",
                  variables: { ...variables },
                });
                if (olderServer)
                  throw new Error(
                    'Unknown argument "currency" on field "Mutation.createLedger".',
                  );
                events.push("created");
                return { data: { createLedger: created } };
              },
              { loading: false },
            ],
          };
        if (id === "expo-localization")
          return {
            getLocales: () => [{ currencyCode: "USD", regionCode: "US" }],
          };
        if (id === "@/common/graphql-unsupported") return unsupported;
        if (id === "@/common/hooks/use-current-user")
          return { useSavedDefaultCurrency: () => null };
        if (id === "./ledger-currency") return currency;
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
        if (id === "./revalidate-on-edit")
          return require("../revalidate-on-edit");
        if (id === "../plan-screen/plan-card")
          return { planKey: (tier: string) => tier };
        if (id === "@/common/hooks/use-toast")
          return {
            useToast: () => ({ showToast: () => events.push("toast") }),
          };
        if (id === "@/common/hooks/use-is-here")
          return { useIsHere: () => () => here };
        if (id === "@/common/content-column") return { contentColumn: {} };
        if (id === "@/components/inline-error")
          return { InlineError: () => null };
        if (id === "@/common/hooks/use-theme-style")
          return { useThemeStyle: () => ({}) };
        if (id === "@/common/hooks/use-translations")
          return { useTranslations: () => ({ t: (key: string) => key }) };
        if (id === "@/common/theme")
          return { useTheme: () => ({ colorTheme: {} }) };
        if (id === "@/common/vars")
          return { ledgerVar: () => events.push("select") };
        if (id === "@/common/theme/switch-colors")
          return { switchTrackProps: () => ({}) };
        if (id === "@/common/rtl") return {};
        if (id === "@expo/vector-icons") return { Ionicons: () => null };
        if (id === "./ledger-name") return names;
        throw new Error(`Unexpected dependency: ${id}`);
      },
    },
  );
  exports.CreateLedgerScreen!();
  return { submit, events, sent };
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
});

// w3/m62: only a non-USD Starter sends the document that declares `currency`;
// everything else is the CreateLedger request installed apps already send.
describe("ledger creation currency", () => {
  it("sends CreateLedger unchanged for a USD Starter", async () => {
    const { submit, sent } = screen(false);
    await submit();
    expect(sent).toEqual([
      {
        document: "CreateLedger",
        variables: { name: "new", private: true, description: undefined },
      },
    ]);
  });

  it("sends CreateLedgerInCurrency for another currency", async () => {
    const { submit, sent, events } = screen(false, true, {
      values: { template: "STARTER", currency: "EUR" },
    });
    await submit();
    expect(sent).toEqual([
      {
        document: "CreateLedgerInCurrency",
        variables: {
          name: "new",
          private: true,
          description: undefined,
          currency: "EUR",
        },
      },
    ]);
    expect(events[0]).toBe("created");
  });

  it("keeps a Sample on CreateLedger whatever the hidden currency says", async () => {
    const { submit, sent } = screen(false, true, {
      values: { template: "SAMPLE", currency: "EUR" },
    });
    await submit();
    expect(sent).toEqual([
      {
        document: "CreateLedger",
        variables: {
          name: "new",
          private: true,
          description: undefined,
          template: "SAMPLE",
        },
      },
    ]);
  });

  it("says so on the field when an older server refuses the currency", async () => {
    const { submit, events } = screen(false, true, {
      values: { template: "STARTER", currency: "EUR" },
      olderServer: true,
    });
    await submit();
    expect(events).toEqual(["form-error:currency"]);
  });
});
