import { describe, it, expect, vi } from "vitest";
import { isRedirect } from "@tanstack/react-router";

/**
 * The legacy `/files/content` route is a compatibility alias that only renders
 * the directory browser. These cases exercise the route module's real
 * `validateSearch` and `beforeLoad`, so a regression in dispatch fails here
 * rather than only in a browser.
 */

// `createFileRoute(path)(options)` normally builds a Route. Returning the
// options verbatim exposes the route's own beforeLoad/validateSearch for direct
// invocation; everything else (including `redirect`) stays real.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, createFileRoute: () => (options: unknown) => options };
});

// The alias renders the directory page; this suite is about dispatch, not that
// component's tree.
vi.mock("@/features/ledger-editor/files-content", () => ({
  default: () => null,
}));

type ContentSearch = {
  type: "file" | "dir";
  path: string;
  editMode?: boolean;
  lineNumber?: number;
};

type ContentRoute = {
  validateSearch: (search: unknown) => ContentSearch;
  beforeLoad: (ctx: {
    params: { ledgerOwner: string; ledgerName: string };
    search: ContentSearch;
  }) => void;
};

const PARAMS = { ledgerOwner: "open_ledger", ledgerName: "stock-example" };

async function loadRoute(): Promise<ContentRoute> {
  const mod =
    await import("@/routes/ledger.$ledgerOwner.$ledgerName.files.content");
  return mod.Route as unknown as ContentRoute;
}

/** Runs the real beforeLoad, returning the thrown redirect's options or null. */
async function dispatch(rawSearch: Record<string, unknown>) {
  const route = await loadRoute();
  // Dispatch lives in beforeLoad; without it the alias silently renders the
  // directory browser for every target, which is the defect this suite pins.
  expect(typeof route.beforeLoad).toBe("function");
  const search = route.validateSearch(rawSearch);
  try {
    route.beforeLoad({ params: PARAMS, search });
    return null;
  } catch (thrown) {
    // A thrown non-redirect would be a real failure, not a dispatch decision.
    expect(isRedirect(thrown)).toBe(true);
    return (
      thrown as {
        options: {
          to: string;
          params: Record<string, string>;
          search: Record<string, unknown>;
          replace?: boolean;
        };
      }
    ).options;
  }
}

const BLOB_ROUTE = "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$";

describe("legacy /files/content alias", () => {
  describe("a file target reaches the canonical file route", () => {
    it("sends type=file to the blob route with the requested path", async () => {
      const redirect = await dispatch({
        type: "file",
        path: "transactions/sales.bean",
      });

      expect(redirect).not.toBeNull();
      expect(redirect?.to).toBe(BLOB_ROUTE);
      expect(redirect?.params).toEqual({
        ledgerOwner: "open_ledger",
        ledgerName: "stock-example",
        branch: "main",
        _splat: "transactions/sales.bean",
      });
    });

    it("replaces the alias in history so Back leaves the Files browser", async () => {
      const redirect = await dispatch({
        type: "file",
        path: "transactions/sales.bean",
      });

      expect(redirect?.replace).toBe(true);
    });

    it("carries a non-default line number through dispatch", async () => {
      const redirect = await dispatch({
        type: "file",
        path: "transactions/sales.bean",
        lineNumber: 42,
      });

      expect(redirect?.search).toMatchObject({ lineNumber: 42 });
    });

    it("forwards editMode instead of deciding permission itself", async () => {
      // The canonical route strips an unauthorized ?editMode= (see
      // text-file-view's canWrite gate). The alias must hand the request over
      // rather than granting or dropping edit access on its own.
      const requested = await dispatch({
        type: "file",
        path: "transactions/sales.bean",
        editMode: true,
      });
      expect(requested?.search).toMatchObject({ editMode: true });

      const notRequested = await dispatch({
        type: "file",
        path: "transactions/sales.bean",
      });
      expect(notRequested?.search).toMatchObject({ editMode: undefined });
    });

    it("does not leave a double slash when the path is absolute", async () => {
      const redirect = await dispatch({
        type: "file",
        path: "/transactions/sales.bean",
      });

      expect(redirect?.params._splat).toBe("transactions/sales.bean");
    });
  });

  describe("directory targets still render the directory browser", () => {
    it("leaves type=dir alone", async () => {
      expect(await dispatch({ type: "dir", path: "transactions" })).toBeNull();
    });

    it("leaves the default (no type) alone", async () => {
      expect(await dispatch({ path: "transactions" })).toBeNull();
    });

    it("leaves type=file with no path alone, since no file was named", async () => {
      expect(await dispatch({ type: "file", path: "" })).toBeNull();
    });
  });
});
