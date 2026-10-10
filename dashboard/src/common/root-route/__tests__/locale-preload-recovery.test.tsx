import { useState } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "react-day-picker";
import { useChangeLanguage } from "@/common/hooks/use-change-language";
import { useTranslations } from "@/common/hooks/use-translations";
import { isLocallyHandledChunkError } from "@/common/lib/errors/chunk-load-error";
import { createLocalization } from "@/i18n/init";
import { persistLanguage } from "@/i18n/funcs";
import { LocalizationProvider } from "@/i18n/provider";
import de from "@/i18n/locales/de";
import { RootComponent } from "../root-component";

type LocaleModule = { default: Record<string, string> };
type PreloadErrorEvent = Event & { payload: unknown };

const state = vi.hoisted(() => ({
  date: undefined as Promise<Locale> | undefined,
  translationStarted: false,
  dateStarted: false,
  events: [] as PreloadErrorEvent[],
}));

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/providers/root-provider", async () => {
  const { Toaster } = await import("sonner");
  return {
    RootProvider: ({ children }: { children: React.ReactNode }) => (
      <>
        {children}
        <Toaster />
      </>
    ),
  };
});
vi.mock("@tanstack/react-devtools", () => ({ TanStackDevtools: () => null }));
vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => null,
}));
vi.mock("@/common/lib/format/date-locale", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/common/lib/format/date-locale")>();
  return {
    ...actual,
    loadDateLocale: (language: Parameters<typeof actual.loadDateLocale>[0]) => {
      if (language !== "ja") return actual.loadDateLocale(language);
      state.dateStarted = true;
      return state.date;
    },
  };
});

// Match the installed Vite helper's ordering: dispatch with the original error,
// then reject unless a synchronous listener prevents its default behavior.
function viteImport<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error) => {
    const event = new Event("vite:preloadError", {
      cancelable: true,
    }) as PreloadErrorEvent;
    event.payload = error;
    state.events.push(event);
    window.dispatchEvent(event);
    if (!event.defaultPrevented) throw error;
    return undefined as T;
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise: viteImport(promise), resolve, reject };
}

function LanguagePage() {
  const { changeLanguage, isChangingLanguage } = useChangeLanguage();
  const { t, i18n } = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <main lang={i18n.language}>
      <h1>{t("page.gallery.ledgerGallery")}</h1>
      <button onClick={() => void changeLanguage("ja")}>日本語</button>
      <button onClick={() => void changeLanguage("en")}>English</button>
      <p role="status">{isChangingLanguage ? "Loading language" : "Ready"}</p>
      <button aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Price history
      </button>
      {open && (
        <table aria-label="Price history">
          <tbody>
            <tr>
              <td>DAI</td>
              <td>1.0000 USD</td>
            </tr>
          </tbody>
        </table>
      )}
    </main>
  );
}

const reload = vi.fn();
const assign = vi.fn();
let translation: ReturnType<typeof deferred<LocaleModule>>;
let date: ReturnType<typeof deferred<Locale>>;
let japanese: LocaleModule;
let japaneseDate: Locale;

beforeEach(async () => {
  vi.clearAllMocks();
  sessionStorage.clear();
  state.events.length = 0;
  state.translationStarted = false;
  state.dateStarted = false;
  translation = deferred<LocaleModule>();
  date = deferred<Locale>();
  state.date = date.promise;
  japanese = await vi.importActual<LocaleModule>("@/i18n/locales/ja");
  const actualDate = await vi.importActual<
    typeof import("@/common/lib/format/date-locale")
  >("@/common/lib/format/date-locale");
  japaneseDate = await actualDate.loadDateLocale("ja");

  const controlledTranslation = translation.promise;
  vi.doMock("@/i18n/locales/ja", () => {
    let constructing = true;
    return {
      default: japanese.default,
      // Vitest wraps rejected mock factories in a different Error. Construct
      // successfully, then control the import promise outside that wrapper.
      get then() {
        if (constructing) {
          constructing = false;
          return undefined;
        }
        return (
          resolve: (module: LocaleModule) => void,
          reject: (error: unknown) => void,
        ) => {
          state.translationStarted = true;
          return controlledTranslation.then(resolve, reject);
        };
      },
    };
  });
  window.history.replaceState(
    window.history.state,
    "",
    "/locale-recovery?time=2016-02&lang=de#history",
  );
  const location = window.location;
  vi.stubGlobal(
    "location",
    new Proxy(
      {},
      {
        get(_target, property) {
          if (property === "reload") return reload;
          if (property === "assign") return assign;
          return Reflect.get(location, property, location);
        },
      },
    ),
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterEach(async () => {
  await act(async () => {
    translation.resolve(japanese);
    date.resolve(japaneseDate);
  });
  await nextTask();
  await act(async () => toast.dismiss());
  cleanup();
  vi.doUnmock("@/i18n/locales/ja");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountPage() {
  const localization = createLocalization();
  await localization.changeLanguage("de");
  persistLanguage("de");
  vi.mocked(localStorage.setItem).mockClear();
  const root = createRootRoute({ component: RootComponent });
  const page = createRoute({
    getParentRoute: () => root,
    path: "/locale-recovery",
    component: LanguagePage,
  });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({
      initialEntries: ["/locale-recovery?time=2016-02&lang=de#history"],
    }),
    isServer: false,
  });
  await router.load();
  const view = render(
    <LocalizationProvider localization={localization}>
      <RouterProvider router={router} />
    </LocalizationProvider>,
  );
  const user = userEvent.setup();
  await user.click(await view.findByRole("button", { name: "Price history" }));
  const history = view.getByRole("table", { name: "Price history" });
  const selectJapanese = async () => {
    await user.click(view.getByRole("button", { name: "日本語" }));
    await waitFor(() => {
      expect(state.dateStarted).toBe(true);
      expect(state.translationStarted).toBe(true);
    });
  };
  return { ...view, user, localization, history, selectJapanese };
}

async function nextTask() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

function expectCurrentGerman(page: Awaited<ReturnType<typeof mountPage>>) {
  expect(page.localization.i18n.language).toBe("de");
  expect(page.localization.getDateLocale().code).toBe("de");
  expect(window.location.search).toBe("?time=2016-02&lang=de");
  expect(window.location.hash).toBe("#history");
  expect(document.cookie).toContain("i18nextLng=de");
  expect(localStorage.setItem).not.toHaveBeenCalled();
  expect(page.getByRole("table", { name: "Price history" })).toBe(page.history);
  expect(page.history).toHaveTextContent("1.0000 USD");
  expect(reload).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("beancount.staleChunkReloadAt")).toBeNull();
}

describe("root preload recovery with asynchronous language imports", () => {
  it.each(["translation", "date"] as const)(
    "keeps German content and preferences when the %s import fails; keyboard retry targets Japanese",
    async (failure) => {
      const page = await mountPage();
      await page.selectJapanese();
      const error = new TypeError(
        "Failed to fetch dynamically imported module",
      );
      await act(async () => {
        if (failure === "translation") {
          date.resolve(japaneseDate);
          translation.reject(error);
        } else {
          translation.resolve(japanese);
          date.reject(error);
        }
      });
      await page.findByText(de["common.errorOccurred"]);
      await nextTask();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].payload).toBe(error);
      expect(state.events[0].defaultPrevented).toBe(false);
      expect(isLocallyHandledChunkError(error)).toBe(true);
      expectCurrentGerman(page);
      expect(page.getByRole("status")).toHaveTextContent("Ready");

      const retry = page.getByRole("button", { name: de["common.tryAgain"] });
      await page.user.tab();
      await page.user.tab();
      await page.user.tab();
      await page.user.tab();
      expect(retry).toHaveFocus();
      await page.user.keyboard("{Enter}");
      expect(assign).toHaveBeenCalledExactlyOnceWith(
        new URL(
          "/locale-recovery?time=2016-02&lang=ja#history",
          window.location.href,
        ),
      );
      expect(reload).not.toHaveBeenCalled();
    },
  );

  it("claims both failed imports even when the second rejects in a later task after feedback", async () => {
    const page = await mountPage();
    await page.selectJapanese();
    const first = new TypeError(
      "Failed to fetch dynamically imported module: text",
    );
    const second = new TypeError(
      "Failed to fetch dynamically imported module: date",
    );
    await act(async () => translation.reject(first));
    await page.findByText(de["common.errorOccurred"]);
    await nextTask();
    expectCurrentGerman(page);
    await act(async () => date.reject(second));
    await nextTask();
    expect(state.events.map(({ payload }) => payload)).toEqual([first, second]);
    expect(isLocallyHandledChunkError(first)).toBe(true);
    expect(isLocallyHandledChunkError(second)).toBe(true);
    expect(
      page.getAllByRole("button", { name: de["common.tryAgain"] }),
    ).toHaveLength(1);
    expectCurrentGerman(page);
  });

  it("consumes obsolete Japanese failures quietly after English succeeds", async () => {
    const page = await mountPage();
    await page.selectJapanese();
    await page.user.click(page.getByRole("button", { name: "English" }));
    await waitFor(() => expect(page.localization.i18n.language).toBe("en"));
    const first = new TypeError(
      "Failed to fetch dynamically imported module: text",
    );
    const second = new TypeError(
      "Failed to fetch dynamically imported module: date",
    );
    await act(async () => {
      translation.reject(first);
      date.reject(second);
    });
    await nextTask();
    expect(state.events).toHaveLength(2);
    expect(isLocallyHandledChunkError(first)).toBe(true);
    expect(isLocallyHandledChunkError(second)).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(
      page.queryByRole("button", { name: "Try Again" }),
    ).not.toBeInTheDocument();
    expect(
      page.queryByText(de["common.errorOccurred"]),
    ).not.toBeInTheDocument();
    expect(page.localization.i18n.language).toBe("en");
    expect(page.localization.getDateLocale().code).toBe("en-US");
    expect(window.location.search).toBe("?time=2016-02&lang=en");
    expect(document.cookie).toContain("i18nextLng=en");
    expect(localStorage.setItem).toHaveBeenCalledExactlyOnceWith(
      "i18nextLng",
      "en",
    );
    expect(page.getByRole("table", { name: "Price history" })).toBe(
      page.history,
    );
    expect(sessionStorage.getItem("beancount.staleChunkReloadAt")).toBeNull();
  });

  it("recovers an unrelated critical import while both locale imports are pending, then honors its loop guard", async () => {
    const page = await mountPage();
    await page.selectJapanese();
    const critical = new TypeError(
      "Failed to fetch dynamically imported module: route",
    );
    const rejected = viteImport(Promise.reject(critical));
    await expect(rejected).rejects.toBe(critical);
    await nextTask();
    expect(isLocallyHandledChunkError(critical)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
    expect(
      sessionStorage.getItem("beancount.staleChunkReloadAt"),
    ).not.toBeNull();
    await expect(viteImport(Promise.reject(critical))).rejects.toBe(critical);
    await nextTask();
    expect(reload).toHaveBeenCalledOnce();
    await act(async () => {
      translation.resolve(japanese);
      date.resolve(japaneseDate);
    });
    await waitFor(() => expect(page.localization.i18n.language).toBe("ja"));
  });

  it("does not mistake a distinct critical error with an identical message for the claimed locale error", async () => {
    const page = await mountPage();
    await page.selectJapanese();
    const local = new TypeError("Failed to fetch dynamically imported module");
    await act(async () => {
      translation.reject(local);
      date.resolve(japaneseDate);
    });
    await page.findByText(de["common.errorOccurred"]);
    await nextTask();
    expectCurrentGerman(page);
    const critical = new TypeError(local.message);
    await expect(viteImport(Promise.reject(critical))).rejects.toBe(critical);
    await nextTask();
    expect(isLocallyHandledChunkError(local)).toBe(true);
    expect(isLocallyHandledChunkError(critical)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("retains queued critical recovery when the rejected route unmounts root", async () => {
    const page = await mountPage();
    const critical = new TypeError(
      "Failed to fetch dynamically imported module: route",
    );
    await expect(viteImport(Promise.reject(critical))).rejects.toBe(critical);
    page.unmount();
    await nextTask();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("leaves critical rejection intact without reloading when session storage is unavailable", async () => {
    await mountPage();
    const read = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Storage denied");
      });
    const critical = new TypeError(
      "Failed to fetch dynamically imported module: route",
    );
    await expect(viteImport(Promise.reject(critical))).rejects.toBe(critical);
    await nextTask();
    expect(reload).not.toHaveBeenCalled();
    read.mockRestore();
  });
});
