jest.mock("../../utils/categorize-transactions", () => ({
  categorizeTransactions: jest.fn(),
}));
jest.mock("@/features/stripe/operations/get-user-tier");
import { categorizeTransactions } from "../../utils/categorize-transactions";
import { estimateCategorizationTokens } from "../../utils/categorize-transactions/estimate-tokens";
import { MAX_SUGGEST_TRANSACTIONS } from "../../utils/suggest-categories-cap";
import { LLMService } from "../llm-service";
import { AiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import { FeatureUsageService } from "@/features/feature-usage/service/feature-usage-service";
import type { IFeatureUsageModel } from "@/features/feature-usage/data/feature-usage-model/types";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import {
  getTierLimits,
  SubscriptionTier,
} from "@/features/stripe/service/stripe";
import { BadUserInputError, ResourceLimitReachedError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";

const FREE_QUOTA = getTierLimits(SubscriptionTier.FREE).aiCfoTokensMax;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const ACCOUNTS = ["Assets:Cash", "Expenses:Coffee"];

/**
 * The usage table in memory. Every call yields before it touches the row,
 * as a database round trip would, so concurrent requests interleave; each
 * method then acts in one step, as its single SQL statement does.
 */
function memoryUsageModel() {
  const rows = new Map<string, number>();
  const key = (userId: string, featureKey: string, month: string) =>
    `${userId}/${featureKey}/${month}`;
  const roundTrip = () => new Promise((resolve) => setImmediate(resolve));
  const model: IFeatureUsageModel = {
    async getCount(_db, userId, featureKey, month) {
      await roundTrip();
      return rows.get(key(userId, featureKey, month)) ?? 0;
    },
    async addAndGetCount(_db, userId, featureKey, month, tokens) {
      await roundTrip();
      const next = (rows.get(key(userId, featureKey, month)) ?? 0) + tokens;
      rows.set(key(userId, featureKey, month), next);
      return next;
    },
    async reserveAndGetCount(_db, userId, featureKey, month, tokens, max) {
      await roundTrip();
      const k = key(userId, featureKey, month);
      if (!rows.has(k)) {
        rows.set(k, tokens);
        return tokens;
      }
      const current = rows.get(k)!;
      if (current >= max) return null;
      rows.set(k, current + tokens);
      return current + tokens;
    },
    async releaseCount(_db, userId, featureKey, month, tokens) {
      await roundTrip();
      const k = key(userId, featureKey, month);
      if (rows.has(k)) rows.set(k, Math.max(0, rows.get(k)! - tokens));
    },
  };
  return { model, total: () => [...rows.values()].reduce((a, b) => a + b, 0) };
}

function makeServiceWithSpies(model: IFeatureUsageModel) {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const getJournal = jest.fn(async () => envelope({ items: [] }));
  const getLedgerPlugins = jest.fn(async () => envelope([]));
  const getLedgerAccounts = jest.fn(async () =>
    envelope(
      Object.fromEntries(
        ACCOUNTS.map((account) => [account, { close_date: null }]),
      ),
    ),
  );
  const fava = {
    getApiContext: async () => ({
      favaApiClient: {
        journal: { getJournal },
        reports: { getLedgerPlugins },
      },
    }),
    getPublicApiClient: async () => ({
      reports: {
        getLedgerAccounts,
      },
    }),
  };
  const authorizeOrThrow = jest.fn(async () => ({ allowed: true }));
  const allow = {
    authorize: jest.fn(async () => ({ allowed: true })),
    authorizeOrThrow,
  };
  const usage = new AiCfoUsageService(
    new FeatureUsageService({ featureUsage: model }, {} as never),
    {} as never,
    allow as never,
  );
  const service = new LLMService(
    fava as never,
    {} as never,
    usage,
    { openai: { apiKey: "", baseUrl: "" } } as never,
    allow as never,
  );
  return {
    service,
    usage,
    authorizeOrThrow,
    getJournal,
    getLedgerPlugins,
    getLedgerAccounts,
  };
}

function makeService(model: IFeatureUsageModel) {
  return makeServiceWithSpies(model).service;
}

const batchOf = (length: number) =>
  Array.from({ length }, (_, rowIndex) => ({
    rowIndex,
    date: "2026-08-01",
    payee: `Coffee shop ${rowIndex}`,
    description: "Card purchase",
    amount: -4.5,
  }));

/** What the service reserves for this batch against the fixture ledger. */
const estimateFor = (transactions: ReturnType<typeof batchOf>) =>
  estimateCategorizationTokens({
    transactions,
    existingAccounts: ACCOUNTS,
    recentExamples: [],
    autoAccounts: false,
  });

let priorAnthropic: string | undefined;
beforeAll(() => {
  priorAnthropic = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "fixture";
});
afterAll(() => {
  if (priorAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = priorAnthropic;
});
beforeEach(() => {
  jest.mocked(getUserTier).mockResolvedValue(SubscriptionTier.FREE);
  jest.mocked(categorizeTransactions).mockReset();
});

/** Every call uses exactly what it reserved: the most a reservation allows. */
function modelUses(tokens: number) {
  jest.mocked(categorizeTransactions).mockImplementation(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    return {
      suggestions: [],
      tokenUsage: { inputTokens: tokens, outputTokens: 0 },
    };
  });
}

async function runConcurrently(calls: number, size: number) {
  const usage = memoryUsageModel();
  const service = makeService(usage.model);
  const transactions = batchOf(size);
  const results = await Promise.allSettled(
    Array.from({ length: calls }, () =>
      service.suggestCategories(identity, "alice/main", transactions),
    ),
  );
  return { results, total: usage.total() };
}

describe("concurrent category suggestions on a free plan", () => {
  it("record at most the tier quota plus one call's reservation", async () => {
    const reservation = estimateFor(batchOf(MAX_SUGGEST_TRANSACTIONS));
    modelUses(reservation);

    const { results, total } = await runConcurrently(
      8,
      MAX_SUGGEST_TRANSACTIONS,
    );

    expect(total).toBeLessThanOrEqual(FREE_QUOTA + reservation);
    const admitted = results.filter((r) => r.status === "fulfilled");
    expect(admitted.length).toBeGreaterThanOrEqual(1);
    expect(total).toBe(admitted.length * reservation);
    for (const refused of results.filter((r) => r.status === "rejected"))
      expect(refused.reason).toBeInstanceOf(ResourceLimitReachedError);
  });

  it("admit calls only while the quota, reservations included, is unspent", async () => {
    const size = 20;
    const reservation = estimateFor(batchOf(size));
    modelUses(reservation);
    const calls = Math.ceil(FREE_QUOTA / reservation) + 5;

    const { results, total } = await runConcurrently(calls, size);

    const admitted = results.filter((r) => r.status === "fulfilled").length;
    expect(admitted).toBe(Math.ceil(FREE_QUOTA / reservation));
    expect(total).toBe(admitted * reservation);
    expect(total).toBeLessThanOrEqual(FREE_QUOTA + reservation);
  });

  it("settle each call to its real usage and release a failed call's hold", async () => {
    const usage = memoryUsageModel();
    const service = makeService(usage.model);
    const transactions = batchOf(10);

    modelUses(37);
    await service.suggestCategories(identity, "alice/main", transactions);
    expect(usage.total()).toBe(37);

    jest
      .mocked(categorizeTransactions)
      .mockRejectedValue(new Error("fixture provider unavailable"));
    await expect(
      service.suggestCategories(identity, "alice/main", transactions),
    ).rejects.toThrow("fixture provider unavailable");
    expect(usage.total()).toBe(37);
  });

  it("refuses an empty batch before authorization, quota, ledger, or model work", async () => {
    const usage = memoryUsageModel();
    const {
      service,
      usage: aiCfoUsage,
      authorizeOrThrow,
      getJournal,
      getLedgerPlugins,
      getLedgerAccounts,
    } = makeServiceWithSpies(usage.model);
    const checkSpy = jest.spyOn(aiCfoUsage, "check");
    const reserveSpy = jest.spyOn(aiCfoUsage, "reserve");
    const settleSpy = jest.spyOn(aiCfoUsage, "settle");

    await expect(
      service.suggestCategories(identity, "alice/main", []),
    ).rejects.toThrow(BadUserInputError);
    await expect(
      service.suggestCategories(identity, "alice/main", []),
    ).rejects.toMatchObject({
      category: "BAD_USER_INPUT",
      message: "transactions must contain at least one transaction",
      metadata: { field: "transactions" },
    });

    expect(authorizeOrThrow).not.toHaveBeenCalled();
    expect(checkSpy).not.toHaveBeenCalled();
    expect(reserveSpy).not.toHaveBeenCalled();
    expect(settleSpy).not.toHaveBeenCalled();
    expect(getLedgerAccounts).not.toHaveBeenCalled();
    expect(getJournal).not.toHaveBeenCalled();
    expect(getLedgerPlugins).not.toHaveBeenCalled();
    expect(categorizeTransactions).not.toHaveBeenCalled();
    expect(usage.total()).toBe(0);
  });
});
