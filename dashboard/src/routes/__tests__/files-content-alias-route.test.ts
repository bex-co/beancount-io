import { describe, it, expect, vi } from "vitest";
import { fileHandoff } from "@/features/ledger-editor/files-content/file-handoff";

/**
 * The legacy `/files/content` route is a compatibility alias that only renders
 * the directory browser. These cases exercise the route module's real
 * `validateSearch` and file handoff, so a regression in dispatch fails here
 * rather than only in a browser. The handoff's lifecycle — after mount, never
 * during hydration — is covered by files-content-alias-handoff.test.tsx.
 */

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, createFileRoute: () => (options: unknown) => options };
});

vi.mock("@/features/ledger-editor/files-content", () => ({
  default: () => null,
}));

const PARAMS = { ledgerOwner: "open_ledger", ledgerName: "stock-example" };

/** Runs the real search validation and handoff decision. */
async function dispatch(rawSearch: Record<string, unknown>) {
  const mod =
    await import("@/routes/ledger.$ledgerOwner.$ledgerName.files.content");
  const route = mod.Route as unknown as {
    validateSearch: (search: unknown) => Parameters<typeof fileHandoff>[1];
    beforeLoad?: unknown;
  };
  // A beforeLoad redirect would change the initial route while it hydrates.
  expect(route.beforeLoad).toBeUndefined();
  return fileHandoff(PARAMS, route.validateSearch(rawSearch));
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
