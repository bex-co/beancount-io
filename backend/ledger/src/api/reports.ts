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
  deriveBeancountOptions,
  parseBcioOptions,
  parseFavaOptions,
  resolveConversion,
} from "@/foundation/rustledger";

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
