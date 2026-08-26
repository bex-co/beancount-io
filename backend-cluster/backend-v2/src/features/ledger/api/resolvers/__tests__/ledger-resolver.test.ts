import "reflect-metadata";
import { LedgerQueryResolver } from "../ledger-resolver.query";
import { LedgerMutationResolver } from "../ledger-resolver.mutation";
import { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { IContext } from "@/server/graphql/context";
import { ForbiddenError } from "@/shared/errors";

/**
 * The resolvers are thin transport adapters: they resolve `userId` from context
 * and delegate to the injected workflow. These tests assert that delegation;
 * the behavioral coverage lives in `workflow/__tests__/ledger-workflow.test.ts`.
 */
describe("Ledger resolvers (delegation)", () => {
  const USER_ID = "user-123";

  let workflow: jest.Mocked<ILedgerWorkflow>;
  let mutationResolver: LedgerMutationResolver;
  let queryResolver: LedgerQueryResolver;
  let ctx: IContext;

  beforeEach(() => {
    workflow = {
      createLedger: jest.fn(),
      updateLedger: jest.fn(),
      deleteLedger: jest.fn(),
      createLedgerFile: jest.fn(),
      updateLedgerFile: jest.fn(),
      deleteLedgerFile: jest.fn(),
      renameLedgerFile: jest.fn(),
      starLedger: jest.fn(),
      unstarLedger: jest.fn(),
      listLedgers: jest.fn(),
      listUserOwnedLedgers: jest.fn(),
      listUserOwnedLedgersWithDirectiveCounts: jest.fn(),
      searchLedgers: jest.fn(),
      getLedger: jest.fn(),
      getLedgerFile: jest.fn(),
      getLedgerDirContent: jest.fn(),
      getLedgerAttributes: jest.fn(),
      getLedgerOptions: jest.fn(),
      getLedgerFavaOptions: jest.fn(),
      getLedgerBcioOptions: jest.fn(),
      isLedgerStarred: jest.fn(),
    };
    mutationResolver = new LedgerMutationResolver(workflow);
    queryResolver = new LedgerQueryResolver(workflow);
    ctx = {
      userId: USER_ID,
      platform: "web",
      getCurrentUserId: () => USER_ID,
    } as unknown as IContext;
  });

  describe("LedgerMutationResolver", () => {
    it("createLedger delegates with userId + input", async () => {
      const input = { name: "ledger" };
      workflow.createLedger.mockResolvedValue({ id: "x" } as never);

      const result = await mutationResolver.createLedger(input as never, ctx);

      expect(workflow.createLedger).toHaveBeenCalledWith({
        userId: USER_ID,
        input,
      });
      expect(result).toEqual({ id: "x" });
    });

    it("updateLedger delegates with userId + ledgerId + input", async () => {
      const input = { name: "new" };
      await mutationResolver.updateLedger("o/l", input as never, ctx);
      expect(workflow.updateLedger).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
        input,
      });
    });

    it("deleteLedger delegates with userId + ledgerId", async () => {
      await mutationResolver.deleteLedger("o/l", ctx);
      expect(workflow.deleteLedger).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
      });
    });

    it("createLedgerFile delegates", async () => {
      const input = { path: "a.bean", content: "x" };
      await mutationResolver.createLedgerFile("o/l", input as never, ctx);
      expect(workflow.createLedgerFile).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
        input,
        platform: "web",
      });
    });

    it("updateLedgerFile delegates", async () => {
      const input = { path: "a.bean", content: "x", sha: "s" };
      await mutationResolver.updateLedgerFile("o/l", input as never, ctx);
      expect(workflow.updateLedgerFile).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
        input,
        platform: "web",
      });
    });

    it("deleteLedgerFile delegates", async () => {
      const input = { path: "a.bean", sha: "s" };
      await mutationResolver.deleteLedgerFile("o/l", input as never, ctx);
      expect(workflow.deleteLedgerFile).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
        input,
      });
    });

    it("renameLedgerFile delegates", async () => {
      const input = { oldPath: "a", newPath: "b" };
      await mutationResolver.renameLedgerFile("o/l", input as never, ctx);
      expect(workflow.renameLedgerFile).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
        input,
      });
    });

    it("starLedger / unstarLedger delegate", async () => {
      await mutationResolver.starLedger("o/l", ctx);
      expect(workflow.starLedger).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
      });
      await mutationResolver.unstarLedger("o/l", ctx);
      expect(workflow.unstarLedger).toHaveBeenCalledWith({
        userId: USER_ID,
        ledgerId: "o/l",
      });
    });
  });

  describe("LedgerQueryResolver", () => {
    it("listLedgers / listUserOwnedLedgers / searchLedgers delegate with userId + args", async () => {
      const args = { page: 1, limit: 10 };
      await queryResolver.listLedgers(args, ctx);
      expect(workflow.listLedgers).toHaveBeenCalledWith({
        userId: USER_ID,
        args,
      });

      await queryResolver.listUserOwnedLedgers(args, ctx);
      expect(workflow.listUserOwnedLedgers).toHaveBeenCalledWith({
        userId: USER_ID,
        args,
      });

      const searchArgs = { q: "x" };
      await queryResolver.searchLedgers(searchArgs, ctx);
      expect(workflow.searchLedgers).toHaveBeenCalledWith({
        userId: USER_ID,
        args: searchArgs,
      });
    });

    it("getLedger uses optional ctx.userId (no auth required)", async () => {
      await queryResolver.getLedger("o/l", ctx);
      expect(workflow.getLedger).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
      });
    });

    it("getLedgerFile / getLedgerDirContent delegate", async () => {
      const fileArgs = { path: "main.bean" };
      await queryResolver.getLedgerFile("o/l", fileArgs, ctx);
      expect(workflow.getLedgerFile).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
        args: fileArgs,
      });

      const dirArgs = { dirPath: "/" };
      await queryResolver.getLedgerDirContent("o/l", dirArgs, ctx);
      expect(workflow.getLedgerDirContent).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
        args: dirArgs,
      });
    });

    it("field resolvers delegate using ledger.id + ctx.userId", async () => {
      const ledger = { id: "o/l" } as never;
      await queryResolver.attributes(ledger, ctx);
      expect(workflow.getLedgerAttributes).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
      });

      await queryResolver.options(ledger, ctx);
      expect(workflow.getLedgerOptions).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
      });

      await queryResolver.favaOptions(ledger, ctx);
      expect(workflow.getLedgerFavaOptions).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
      });

      await queryResolver.bcioOptions(ledger, ctx);
      expect(workflow.getLedgerBcioOptions).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
      });

      await queryResolver.isStarred(ledger, ctx);
      expect(workflow.isLedgerStarred).toHaveBeenCalledWith({
        ledgerId: "o/l",
        userId: USER_ID,
      });
    });

    /**
     * These five take their ledger from the parent object, so the argument-keyed
     * pin middleware never sees it — and `listLedgers` hands back every ledger
     * the user can reach. Without a check here a credential confined to one book
     * reads the contents of all of them, one field resolution at a time.
     */
    describe("field resolvers enforce the credential's ledger pin", () => {
      const pinnedCtx = {
        ...ctx,
        identity: {
          userId: USER_ID,
          method: "apikey",
          scopes: new Set(["ledger.read"]),
          ledgerScope: "o/l",
          capabilityExempt: false,
        },
      } as unknown as IContext;

      const fieldResolvers = [
        ["attributes", "getLedgerAttributes"],
        ["options", "getLedgerOptions"],
        ["favaOptions", "getLedgerFavaOptions"],
        ["bcioOptions", "getLedgerBcioOptions"],
        ["isStarred", "isLedgerStarred"],
      ] as const;

      it.each(fieldResolvers)(
        "%s refuses a ledger the credential is not pinned to",
        async (field, delegate) => {
          await expect(
            queryResolver[field]({ id: "o/other" } as never, pinnedCtx),
          ).rejects.toThrow(ForbiddenError);
          expect(workflow[delegate]).not.toHaveBeenCalled();
        },
      );

      it.each(fieldResolvers)("%s allows the pinned ledger", async (field) => {
        await expect(
          queryResolver[field]({ id: "o/l" } as never, pinnedCtx),
        ).resolves.not.toThrow();
      });

      it("leaves an unpinned caller alone", async () => {
        // `ctx` carries no identity at all — the anonymous public-ledger read
        // these fields have always allowed.
        await expect(
          queryResolver.attributes({ id: "o/other" } as never, ctx),
        ).resolves.not.toThrow();
      });
    });
  });
});
