import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as guestState from "../../../common/guest/guest-state";
import * as serverUrls from "../../../common/server-url-validation";

let serverUrl = "https://beancount.io/";
let session: object | null = null;
const react = {
  createContext: () => ({}),
  // Keep children unmounted so the real route boundary decides whether any
  // preview session (and therefore its catalog queries) may mount.
  createElement: (type: unknown, props: unknown) => ({ type, props }),
};
const loaded: any = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../examples-layout.tsx"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText,
  {
    exports: loaded,
    React: react,
    require(id: string) {
      if (id === "react") return react;
      if (id === "@apollo/client")
        return { useReactiveVar: (read: () => unknown) => read() };
      if (id === "expo-router") return { Redirect: "Redirect" };
      if (id === "@/common/guest/guest-state") return guestState;
      if (id === "@/common/server-url-validation") return serverUrls;
      if (id === "@/common/vars/server-url")
        return {
          getServerUrl: () => serverUrl,
          serverUrlOverrideVar: () => serverUrl,
        };
      if (id === "@/common/vars/session") return { sessionVar: () => session };
      if (
        [
          "react-native",
          "@/components/stack-back-button",
          "./example-ledger-provider",
          "./example-routes",
          "@/common/hooks/use-translations",
          "@/common/hooks",
          "@/common/theme",
          "@/screens/welcome/use-native-sign-in",
          "./use-example-catalog",
        ].includes(id)
      )
        return {};
      throw new Error(`Unexpected dependency: ${id}`);
    },
  },
);

describe("preview endpoint route guard", () => {
  afterEach(() => {
    guestState.clearGuestVisit();
    session = null;
  });
  for (const url of [
    "https://books.example/",
    "http://localhost:8000/",
    "https://beancount.io/custom/",
  ]) {
    it(`rejects a preview deep link on ${url}, even with a matching guest visit`, () => {
      serverUrl = url;
      guestState.startGuestVisit(url);
      guestState.updateGuestVisit({
        ledgerId: "open_ledger/nvidia",
        view: "files",
      });
      const tree = loaded.ExamplesLayout();
      expect(tree.type).toBe("Redirect");
      expect(tree.props.href).toBe("/auth/welcome");
      session = {};
      expect(loaded.ExamplesLayout().props.href).toBe("/(app)/(tabs)");
    });
  }
  it("allows the official endpoint and stops rendering the preview after switching servers", () => {
    serverUrl = "https://beancount.io/";
    guestState.startGuestVisit(serverUrl);
    const tree = loaded.ExamplesLayout();
    expect(typeof tree.type).toBe("function");
    expect(tree.props.visit).toBe(guestState.guestVisitVar());
    serverUrl = "https://books.example/";
    expect(loaded.ExamplesLayout().type).toBe("Redirect");
  });
});
