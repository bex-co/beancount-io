import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as names from "../ledger-name";

// Run the real submission handler, replacing only UI/form hosts and its IO.
function screen(refreshFails: boolean) {
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
            router: { replace: () => events.push("navigate") },
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
                  });
                return submit;
              },
              setError: () => events.push("form-error"),
              watch: () => "new",
              formState: { errors: {}, isSubmitting: false },
            }),
          };
        if (id === "@/generated-graphql/graphql")
          return {
            LedgerTemplate: { Sample: "SAMPLE" },
            useCreateLedgerMutation: () => [
              async () => {
                events.push("created");
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
        if (id === "@/common/hooks/use-theme-style")
          return { useThemeStyle: () => ({}) };
        if (id === "@/common/hooks/use-translations")
          return { useTranslations: () => ({ t: (key: string) => key }) };
        if (id === "@/common/theme")
          return { useTheme: () => ({ colorTheme: {} }) };
        if (id === "@/common/vars")
          return { ledgerVar: () => events.push("select") };
        if (id === "@/common/rtl") return {};
        if (id === "./ledger-name") return names;
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
});
