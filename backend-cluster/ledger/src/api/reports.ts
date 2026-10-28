import Router from "@koa/router";
import { authMiddleware } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { strQuery } from "./query-params";
import {
  ledgerIdOf,
  loadSnapshotForRequest,
  servicesForRequest,
} from "./service-context";
import {
  accountHierarchy,
  buildPriceMap,
  collectLedgerCommodities,
  deriveBeancountOptions,
  parseBcioOptions,
  parseFavaOptions,
  resolveConversion,
} from "@/foundation/rustledger";
import { BadUserInputError } from "@/shared/errors";

/** An append writes at most 50 directives; this leaves room, not a ledger. */
const MAX_LOCATIONS = 200;

/** The shared `time`/`filter`/`account` selector triple. */
function selectors(ctx: Parameters<typeof ledgerIdOf>[0]) {
  return {
    account: strQuery(ctx.query.account),
    filter: strQuery(ctx.query.filter),
    time: strQuery(ctx.query.time),
  };
}

export function setReportsHandler(router: Router): void {
  const base = "/reports/:owner/:repo_name";

  // ---- data-service reads -------------------------------------------------
  router.get(`${base}/attributes`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getAttributes({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
      }),
    );
  });

  router.get(`${base}/errors`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getErrors({ ledgerId: ledgerIdOf(ctx), userId: undefined }),
    );
  });

  // operationId: getLedgerManagedPrices — managed price include status
  // (ADR 015 §8). Loads the file map and feed cache only; no parse.
  router.get(`${base}/managed-prices`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getManagedPrices({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
      }),
    );
  });

  // operationId: refreshLedgerManagedPrices — make every managed feed the
  // ledger names due now and return the re-resolved status (ADR 015 §5).
  router.post(`${base}/managed-prices/refresh`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.refreshManagedPrices({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
      }),
    );
  });

  // operationId: checkProjectedErrors — POST /reports/{o}/{r}/check
  // bean-check over projected file contents (base64 text; null deletes),
  // parsed without committing. Powers dry-run previews (w2/m26).
  router.post(`${base}/check`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      files?: { path: string; content: string | null }[];
    };
    ctx.body = successResponse(
      await data.checkProjectedErrors({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        overlays: body.files ?? [],
      }),
    );
  });

  // operationId: getProjectedSourceFiles — POST /reports/{o}/{r}/source-files
  // The files the projected ledger loads (base64 text; null deletes): how a
  // write tells whether a file it routes to would be read at all (w23/062).
  router.post(`${base}/source-files`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      files?: { path: string; content: string | null }[];
    };
    ctx.body = successResponse(
      await data.projectedSourceFiles({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        overlays: body.files ?? [],
      }),
    );
  });

  // operationId: getProjectedEntryIds — POST /reports/{o}/{r}/entry-ids
  // The entry ID of the directive starting on each `{path, line}` (1-based)
  // of the projected ledger, `null` where none does: how a write that
  // commits these files tells its caller the hashes it created (w23/060).
  router.post(`${base}/entry-ids`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      files?: { path: string; content: string | null }[];
      locations?: { path: string; line: number }[];
    };
    const locations = body.locations ?? [];
    if (!Array.isArray(locations) || locations.length > MAX_LOCATIONS) {
      throw new BadUserInputError(
        `at most ${MAX_LOCATIONS} locations may be resolved at once`,
      );
    }
    const ranges = locations.map((location, index) => {
      if (
        location === null ||
        typeof location !== "object" ||
        typeof location.path !== "string" ||
        !Number.isInteger(location.line) ||
        location.line < 1
      ) {
        throw new BadUserInputError(
          `locations[${index}] must name a path and a 1-based line`,
        );
      }
      return {
        file: location.path,
        startLine: location.line - 1,
        lineCount: 1,
      };
    });
    ctx.body = successResponse({
      entry_hashes: await data.projectedEntryIds({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        overlays: body.files ?? [],
        ranges,
      }),
    });
  });

  // operationId: checkLedgerFiles — POST /reports/check-files
  // bean-check over a complete set of files that is not a repository yet:
  // the ledger a guided setup would create, before it is created (w23/048).
  router.post("/reports/check-files", authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      files?: { path: string; content: string }[];
    };
    ctx.body = successResponse(
      await data.checkLedgerFiles({ files: body.files ?? [] }),
    );
  });

  router.get(`${base}/commodities`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getCommodities({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/events`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getEvents({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/documents`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getDocuments({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/payee-transactions`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getPayeeTransactions({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        payee: strQuery(ctx.query.payee) ?? "",
      }),
    );
  });

  router.get(`${base}/narration-transactions`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getNarrationTransactions({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        narration: strQuery(ctx.query.narration) ?? "",
      }),
    );
  });

  router.get(`${base}/payee-accounts`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getPayeeAccounts({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        payee: strQuery(ctx.query.payee) ?? "",
      }),
    );
  });

  for (const [path, method] of [
    ["narrations", "getNarrations"],
    ["payees", "getPayees"],
    ["links", "getLinks"],
    ["years", "getYears"],
    ["currencies", "getCurrencies"],
    ["tags", "getTags"],
    ["source-files", "getSourceFiles"],
  ] as const) {
    router.get(`${base}/${path}`, authMiddleware, async (ctx) => {
      const { data } = servicesForRequest(ctx);
      ctx.body = successResponse(
        await data[method]({ ledgerId: ledgerIdOf(ctx), userId: undefined }),
      );
    });
  }

  router.get(`${base}/account_last_entries`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getAccountLastEntries({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/entries_count_per_type`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getEntriesCountPerType({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/postings_per_account`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getPostingsPerAccount({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/account_report`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getAccountReport({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        accountName: strQuery(ctx.query.account_name) ?? "",
        conversion: strQuery(ctx.query.conversion),
        interval: strQuery(ctx.query.interval),
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/interval-totals`, authMiddleware, async (ctx) => {
    const { data } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await data.getIntervalTotals({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        accountName: strQuery(ctx.query.account_name) ?? "",
        conversion: strQuery(ctx.query.conversion),
        interval: strQuery(ctx.query.interval),
        ...selectors(ctx),
      }),
    );
  });

  // ---- accounts — wire is the Python `dict[str, AccountDataPublic]` map,
  // produced directly by the golden-validated engine `collectLedgerAccounts`.
  router.get(`${base}/accounts`, authMiddleware, async (ctx) => {
    const { snapshot } = await loadSnapshotForRequest(ctx, ledgerIdOf(ctx));
    const { collectLedgerAccounts } =
      await import("@/foundation/rustledger/account-list");
    ctx.body = successResponse(collectLedgerAccounts(snapshot.directives));
  });

  // ---- engine-direct options/plugins reads --------------------------------
  router.get(`${base}/options`, authMiddleware, async (ctx) => {
    const { files, entryPoint, snapshot } = await loadSnapshotForRequest(
      ctx,
      ledgerIdOf(ctx),
    );
    // ONLY the entry-point file: beancount ignores `option` directives in
    // included files (donor parity checklist risk #10).
    ctx.body = successResponse(
      deriveBeancountOptions({
        title: snapshot.options.title,
        operatingCurrencies: snapshot.options.operating_currencies ?? [],
        source: files[entryPoint] ?? "",
      }),
    );
  });

  router.get(`${base}/fava-options`, authMiddleware, async (ctx) => {
    const { snapshot } = await loadSnapshotForRequest(ctx, ledgerIdOf(ctx));
    ctx.body = successResponse(parseFavaOptions(snapshot.directives));
  });

  router.get(`${base}/beancountio-options`, authMiddleware, async (ctx) => {
    const { snapshot } = await loadSnapshotForRequest(ctx, ledgerIdOf(ctx));
    ctx.body = successResponse(parseBcioOptions(snapshot.directives));
  });

  router.get(`${base}/plugins`, authMiddleware, async (ctx) => {
    const { files, entryPoint } = await loadSnapshotForRequest(
      ctx,
      ledgerIdOf(ctx),
    );
    const { collectLedgerPlugins } =
      await import("@/foundation/rustledger/plugins/collect-plugins");
    ctx.body = successResponse(collectLedgerPlugins(files[entryPoint] ?? ""));
  });

  // ---- hierarchy (engine-direct; Python ChartModule.hierarchy) ------------
  router.get(`${base}/hierarchy`, authMiddleware, async (ctx) => {
    const { snapshot } = await loadSnapshotForRequest(ctx, ledgerIdOf(ctx));
    const accountName = strQuery(ctx.query.account_name) ?? "";
    const conversion = strQuery(ctx.query.conversion) ?? "USD";
    const priceMap = buildPriceMap(snapshot.directives);
    const target = resolveConversion(
      conversion,
      snapshot.directives,
      snapshot.options.operating_currencies?.[0] ?? "USD",
      collectLedgerCommodities(snapshot.directives),
    );
    const tree = accountHierarchy(
      snapshot.directives,
      accountName,
      typeof target === "string" ? target : conversion,
      priceMap,
    );
    ctx.body = successResponse(tree);
  });

  // ---- financial statements (finance service) -----------------------------
  router.get(`${base}/income-statement`, authMiddleware, async (ctx) => {
    const { finance } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await finance.getIncomeStatement({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        conversion: strQuery(ctx.query.conversion),
        interval: strQuery(ctx.query.interval),
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/trial-balance`, authMiddleware, async (ctx) => {
    const { finance } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await finance.getTrialBalance({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        conversion: strQuery(ctx.query.conversion),
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/balance-sheet`, authMiddleware, async (ctx) => {
    const { finance } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await finance.getBalanceSheet({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        conversion: strQuery(ctx.query.conversion),
        interval: strQuery(ctx.query.interval),
        ...selectors(ctx),
      }),
    );
  });

  router.get(`${base}/overview`, authMiddleware, async (ctx) => {
    const { finance } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await finance.getOverview({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        conversion: strQuery(ctx.query.conversion),
        interval: strQuery(ctx.query.interval),
        ...selectors(ctx),
      }),
    );
  });
}
