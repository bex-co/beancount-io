import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

/**
 * w21/298: a link that arrived while another was opening was dropped, and the
 * user landed on the first link's ledger. Runs the real `useAppLinkHandler`
 * with a minimal React and a controllable `openAppLinkTarget`.
 */
type Target = { ledgerFullName: string; href: string };
const navigated: string[] = [];
const aborted: string[] = [];
const started: string[] = [];
let session: { userId: string; serverUrl: string } | null;
let linkListener: ((event: { url: string }) => void) | null;
let releases: (() => void)[];

function mount() {
  const exports: Record<string, any> = {};
  const slots: { current: unknown }[] = [];
  let cursor = 0;
  const react = {
    useRef: (initial: unknown) => (
      (slots[cursor] ??= { current: initial }),
      slots[cursor++]
    ),
    useEffect: (effect: () => unknown) => {
      effect();
    },
  };
  const modules: Record<string, unknown> = {
    react,
    "react-native": {
      Linking: { getInitialURL: async () => null },
    },
    "expo-linking": {
      getLinkingURL: () => null,
      addEventListener: (
        _: string,
        listener: (event: { url: string }) => void,
      ) => {
        linkListener = listener;
        return { remove() {} };
      },
    },
    "@apollo/client": {
      useApolloClient: () => ({}),
      useReactiveVar: () => session,
    },
    "@/common/vars": { sessionVar: {} },
    "@/common/vars/server-url": { getServerUrl: () => "https://books.example" },
    "./open-app-link": {
      isOAuthCallbackUrl: () => false,
      afterNavigatorReady: async () => undefined,
      openAppLinkTarget: async ({
        target,
        isCurrentSession,
      }: {
        target: Target;
        isCurrentSession: () => boolean;
      }) => {
        started.push(target.ledgerFullName);
        // The readability probe.
        await new Promise<void>((resolve) => releases.push(resolve));
        if (!isCurrentSession()) {
          aborted.push(target.ledgerFullName);
          return { ok: false, reason: "aborted" };
        }
        navigated.push(target.ledgerFullName);
        return { ok: true };
      },
    },
    "./pending-app-link": {
      routeIncomingAppLink: () => true,
      takePendingAppLink: () => null,
      clearPendingAppLink: () => undefined,
    },
    "expo-router": { router: { replace: () => undefined } },
    "@/common/guest/guest-state": {
      clearGuestVisit: () => undefined,
      startGuestVisit: () => undefined,
      updateGuestVisit: () => undefined,
    },
    "@/screens/examples/example-routes": { exampleRoutes: {} },
    "@/common/site-url": { withAppMarker: (url: string) => url },
    "./guest-link-visit": { guestLinkVisit: () => null },
    "./server-link": {
      resolveServerLink: (url: string) => ({
        kind: "open",
        target: { ledgerFullName: url, href: "/transactions" } as Target,
        url,
      }),
    },
  };
  const source = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "..", "use-app-link-handler.ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    Promise,
    require: (id: string) => {
      if (!(id in modules)) throw new Error(`Unexpected dependency ${id}`);
      return modules[id];
    },
  });
  exports.useAppLinkHandler();
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  navigated.length = 0;
  aborted.length = 0;
  started.length = 0;
  releases = [];
  linkListener = null;
  session = { userId: "u1", serverUrl: "https://books.example" };
  mount();
});

describe("a second app link while the first is opening", () => {
  it("ends on the last link, and the first never navigates", async () => {
    linkListener!({ url: "alice/books/journal" });
    await settle();
    linkListener!({ url: "bob/taxes/journal" });
    await settle();
    // A's probe finishes: superseded, it stops; B then runs its own.
    releases.shift()!();
    await settle();
    releases.shift()!();
    await settle();
    expect(started).toEqual(["alice/books/journal", "bob/taxes/journal"]);
    expect(aborted).toEqual(["alice/books/journal"]);
    expect(navigated).toEqual(["bob/taxes/journal"]);
  });

  it("keeps only the newest of several queued links", async () => {
    linkListener!({ url: "a" });
    await settle();
    linkListener!({ url: "b" });
    linkListener!({ url: "c" });
    await settle();
    releases.shift()!();
    await settle();
    releases.shift()!();
    await settle();
    expect(started).toEqual(["a", "c"]);
    expect(navigated).toEqual(["c"]);
  });

  it("still opens a single link, and one after it settled", async () => {
    linkListener!({ url: "a" });
    await settle();
    releases.shift()!();
    await settle();
    linkListener!({ url: "b" });
    await settle();
    releases.shift()!();
    await settle();
    expect(navigated).toEqual(["a", "b"]);
  });
});
