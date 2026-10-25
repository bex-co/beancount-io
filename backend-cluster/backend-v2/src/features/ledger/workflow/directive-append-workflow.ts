import { type BcioOptionsPublic, unwrapFavaResponse } from "@/foundation/fava";
import { logger } from "@/shared/logger";
import { parseLedgerId } from "@/shared/str";
import type { DirectiveLimitPreview } from "@/features/ledger/operations/directive-limit-preview";
import { BadUserInputError } from "@/shared/errors";
import { resolveEntryFile } from "@/features/ledger/utils/entry-file-resolver";
import { parseDirectiveDate } from "@/features/ledger/utils/directive-date";
import { assertAmountsFitEngineDecimal } from "@/features/ledger/utils/engine-decimal";
import {
  insertDirectives,
  parseDirectiveText,
} from "@/features/ledger/utils/directive-text";
import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";
import { addIncludeLines } from "@/features/ledger/utils/include-target";
import { LEDGER_ENTRY_POINT } from "@/features/ledger/utils/ledger-entry-point";
import { assertWritableText } from "@/shared/file-content";
import { unifiedDiff } from "@/shared/unified-diff";
import {
  diffBeanCheckErrors,
  toBeanCheckErrors,
} from "@/features/ledger/utils/bean-check-errors";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type {
  ILedgerRepoService,
  ILedgerGeneratedFileWriter,
} from "@/features/ledger/service/ledger-repo-service";
import type { Identity } from "@/server/api/identity";
import {
  MAX_APPENDED_DIRECTIVES,
  unbalancedOrValidationError,
  type AppendDirectiveTextInput,
  type AppendDirectiveTextResult,
} from "@/features/ledger/utils/directive-text-contract";

/**
 * Appending Beancount text, coordinated over the repository service (w2/012).
 *
 * This lived inside `LedgerEntryService`'s writer, driving the raw Fava client
 * to read files, bean-check a projection, and commit — a second write path
 * into the repository that the repo service's guards did not cover. The gap
 * that mattered: `assertSafeRepoPath` ran only on a caller-supplied `path`, so
 * a target produced by the ledger's own routing rules reached the commit
 * unasserted.
 *
 * It moved here rather than into the service because it is multi-step
 * coordination — parse, route, read, project, check, commit — which is what
 * `workflow/` is for. The steps that touch the repository now go through
 * `ILedgerRepoService` plus its internal generated-file writer, so every path
 * is asserted per operation. Generated merges can grow past the explicit-file
 * upload cap without changing authorization, path or repository guards.
 *
 * The reason this was deferred out of m28 — that `LEDGER_FILES_WRITE` would
 * narrow the credential ceiling alongside `LEDGER_ENTRIES_WRITE` — turned out
 * not to hold: the two actions declare the same relationship
 * (`ledger` → `write_contents`), the same credential requirement, and the same
 * audit class, so the ceiling is identical and only the audit trail gains a
 * row. That row is honest — this operation does write files.
 */
export interface IDirectiveAppendWorkflow {
  appendDirectiveText(params: {
    identity: Identity;
    ledgerId: string;
    input: AppendDirectiveTextInput;
  }): Promise<AppendDirectiveTextResult>;
}

/** Exactly the repository capabilities an append needs, and no others. */
type RepoDeps = Pick<
  ILedgerRepoService,
  | "getFilesContent"
  | "checkProjectedFiles"
  | "projectedSourceFiles"
  | "projectedEntryHashes"
> &
  ILedgerGeneratedFileWriter;

export class DirectiveAppendWorkflow implements IDirectiveAppendWorkflow {
  private readonly logger = logger.child({ module: "directive-append" });

  constructor(
    private readonly ledgerRepo: RepoDeps,
    private readonly favaClientFactory: IFavaClientFactory,
    /** Lets a preview refuse what the commit would (w5/904); absent, a preview does not look. */
    private readonly limitPreview?: DirectiveLimitPreview,
  ) {}

  /**
   * The order matters: parse, route, project, *check the projection*, then
   * commit. Checking after the commit would leave the caller holding a broken
   * ledger and a refusal, which is the failure mode `allowInvalid` exists to
   * make a deliberate choice rather than an accident.
   */
  async appendDirectiveText({
    identity,
    ledgerId,
    input,
  }: {
    identity: Identity;
    ledgerId: string;
    input: AppendDirectiveTextInput;
  }): Promise<AppendDirectiveTextResult> {
    const { text, path, dryRun = false, allowInvalid = false } = input;
    // The projected bean-check cannot see engine rounding: it runs the engine
    // over the new text and the engine rounds instead of failing. Refuse an
    // amount past its 28 digits here, before any read (w23/081).
    assertAmountsFitEngineDecimal(text);
    const directives = parseDirectiveText(text);
    if (directives.length > MAX_APPENDED_DIRECTIVES) {
      throw new BadUserInputError(
        `text holds ${directives.length} directives; at most ${MAX_APPENDED_DIRECTIVES} may be appended per call. Split the text into several calls.`,
      );
    }
    // A date that is not on the calendar is refused before any routing: the
    // router would otherwise throw on it, and only for a ledger that routes
    // by date, so the same typo was a server error or not depending on the
    // ledger's options.
    const dates = directives.map((directive) =>
      directive.date === null ? null : parseDirectiveDate(directive.date),
    );
    // Still asserted here, ahead of any work, so a bad explicit path is a
    // refusal rather than a wasted read. Auto-routed targets are asserted too
    // now — by the repo service, on every operation it is handed.
    if (path !== undefined) {
      assertSafeRepoPath(path, "path");
      await this.assertLoaded(ledgerId, identity, path);
    }

    const bcioData = await this.fetchBcioOptions(ledgerId, identity);

    // Group by target file so one commit covers however many files the
    // ledger's own routing rules spread the text across.
    const byPath = new Map<string, typeof directives>();
    for (const [index, directive] of directives.entries()) {
      const target =
        path ??
        (bcioData
          ? resolveEntryFile(
              directive.kind,
              dates[index] ?? new Date(),
              bcioData,
            )
          : "main.bean");
      const group = byPath.get(target);
      if (group) group.push(directive);
      else byPath.set(target, [directive]);
    }

    // One batched read rather than one call per file. A target that does not
    // exist yet is simply absent from the result — which is how a `create`
    // tells itself apart from an `update` below.
    const existing = new Map(
      (
        await this.ledgerRepo.getFilesContent({
          ledgerId,
          identity,
          paths: [...byPath.keys()],
        })
      ).map((file) => [file.path, file]),
    );

    // Routing can reach a file nothing includes — a new year's file under
    // per-year includes — whose directives would commit unseen by any report
    // and pass a check that never loads them. The entry point gains the
    // include in the same commit, ahead of any directive threaded into it
    // (w23/062). A named `path` is a loaded file already (w23/035).
    const included =
      path === undefined
        ? await this.unloadedTargets(
            ledgerId,
            identity,
            [...byPath.keys()],
            existing,
          )
        : [];
    if (included.length > 0 && !existing.has(LEDGER_ENTRY_POINT)) {
      const [entryPoint] = await this.ledgerRepo.getFilesContent({
        ledgerId,
        identity,
        paths: [LEDGER_ENTRY_POINT],
      });
      if (entryPoint) existing.set(LEDGER_ENTRY_POINT, entryPoint);
    }
    const withIncludes = (target: string, content: string) =>
      target === LEDGER_ENTRY_POINT
        ? addIncludeLines(content, included)
        : content;

    // One record per touched file rather than five collections keyed on the
    // same path: the sha, the projected text, and where each directive landed
    // travel together, so nothing has to be re-looked-up to build the commit.
    const targets = [...byPath].map(([target, targetDirectives]) => {
      const current = existing.get(target);
      // Inserting re-encodes the whole file (w23/030).
      if (current) assertWritableText(current);
      const before = current?.content ?? "";
      const result = insertDirectives(
        withIncludes(target, before),
        targetDirectives,
      );
      return {
        path: target,
        sha: current?.sha,
        before: current ? before : null,
        content: result.content,
        lines: result.inserted.map((inserted) => inserted.line),
        appended: result.appended,
      };
    });
    const entryPoint = existing.get(LEDGER_ENTRY_POINT);
    if (included.length > 0 && entryPoint && !byPath.has(LEDGER_ENTRY_POINT)) {
      assertWritableText(entryPoint);
      targets.push({
        path: LEDGER_ENTRY_POINT,
        sha: entryPoint.sha,
        before: entryPoint.content,
        content: withIncludes(LEDGER_ENTRY_POINT, entryPoint.content),
        lines: [],
        appended: false,
      });
    }

    // Only a preview asks here: a commit is checked where it lands, by the
    // ledger service, and a second look would only add a count to every write.
    if (dryRun && this.limitPreview) {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      await this.limitPreview.assertRoom({
        client: await this.favaClientFactory.getPublicApiClient(
          ledgerId,
          identity.userId,
        ),
        owner: ledgerOwner,
        repo: ledgerName,
        adding: directives.length,
      });
    }

    const [baseline, projected] = await Promise.all([
      this.checkProjected(ledgerId, identity, []),
      this.checkProjected(
        ledgerId,
        identity,
        targets.map(({ path: p, content }) => ({ path: p, content })),
      ),
    ]);
    const newErrors = diffBeanCheckErrors(baseline, projected);

    // Only a commit is refused: a preview exists to show what the write would
    // break, so it returns the diff and `newErrors` instead (w1/037). The
    // alternative taught agents to preview with `allowInvalid` and then commit
    // the same call — recording exactly what this refusal guards against.
    if (newErrors.length > 0 && !allowInvalid && !dryRun) {
      throw unbalancedOrValidationError(newErrors);
    }

    const paths = [...byPath.keys()];
    const noun = directives.length === 1 ? "directive" : "directives";
    const includes =
      included.length === 0
        ? ""
        : `; ${LEDGER_ENTRY_POINT} ${dryRun ? "would include" : "now includes"} ${included.join(", ")}`;
    const summary = `${directives.length} ${noun} to ${paths.join(", ")}${includes}`;
    const wrote = targets.flatMap((target) =>
      target.lines.map((line) => ({ path: target.path, line })),
    );
    let entryHashes: string[] = [];
    if (!dryRun) {
      await this.ledgerRepo.changeGeneratedFiles({
        ledgerId,
        identity,
        operations: targets.map((target) => ({
          operation: target.sha ? ("update" as const) : ("create" as const),
          path: target.path,
          content: target.content,
          ...(target.sha && { sha: target.sha }),
        })),
        message: `Add ${summary}`,
      });
      this.logger.info("Appended directive text", {
        ledgerId,
        count: directives.length,
        paths,
      });
      entryHashes = await this.writtenEntryHashes(
        ledgerId,
        identity,
        targets,
        wrote,
      );
    }

    return {
      success: true,
      message: dryRun ? `Would add ${summary}` : `Added ${summary}`,
      dryRun,
      count: directives.length,
      wrote: dryRun ? [] : wrote,
      entryHashes,
      // A commit's diff is the ledger's history; a preview's diff is the only
      // place the caller can see what it approved — so it is only computed
      // when it will be read. A line-by-line diff of a whole ledger file is
      // not free.
      diff: dryRun
        ? targets.map((target) => ({
            path: target.path,
            diff: unifiedDiff(target.path, target.before, target.content),
          }))
        : [],
      errorsBefore: baseline.length,
      errorsAfter: projected.length,
      newErrors,
      appendedUnsorted: targets
        .filter((target) => target.appended)
        .map((target) => target.path),
    };
  }

  /**
   * The routed targets the ledger would not load once written: the closure
   * of the repository plus the files this write creates (w23/062). A ledger
   * service that cannot answer — one deployed before the route — leaves the
   * write as it was before, rather than refusing every routed append.
   */
  private async unloadedTargets(
    ledgerId: string,
    identity: Identity,
    paths: string[],
    existing: Map<string, { content: string }>,
  ): Promise<string[]> {
    let loaded: Set<string>;
    try {
      loaded = new Set(
        await this.ledgerRepo.projectedSourceFiles({
          ledgerId,
          identity,
          overlays: paths
            .filter((target) => !existing.has(target))
            .map((target) => ({ path: target, content: "" })),
        }),
      );
    } catch (error) {
      this.logger.warn("Could not list the projected include closure", {
        ledgerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
    return paths.filter((target) => !loaded.has(target));
  }

  /**
   * The hashes the committed directives now carry, in text order, so the
   * caller can read, edit or delete what it wrote (w23/060). Best-effort:
   * the commit has landed, so a failed lookup costs the hashes, not the
   * write — and a partial list would not say which hash is whose.
   */
  private async writtenEntryHashes(
    ledgerId: string,
    identity: Identity,
    targets: { path: string; content: string }[],
    wrote: { path: string; line: number }[],
  ): Promise<string[]> {
    try {
      const hashes = await this.ledgerRepo.projectedEntryHashes({
        ledgerId,
        identity,
        overlays: targets.map(({ path, content }) => ({ path, content })),
        locations: wrote,
      });
      return hashes.every((hash): hash is string => hash !== null)
        ? hashes
        : [];
    } catch (error) {
      this.logger.warn("Could not resolve the appended entries' hashes", {
        ledgerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async checkProjected(
    ledgerId: string,
    identity: Identity,
    overlays: { path: string; content: string }[],
  ) {
    return toBeanCheckErrors(
      await this.ledgerRepo.checkProjectedFiles({
        ledgerId,
        identity,
        overlays,
      }),
    );
  }

  /**
   * The ledger's own entry-routing rules.
   *
   * Read straight from the ledger service, as `LedgerReceiptWorkflow` does for
   * the same options: it is a report read that shapes where a write lands, not
   * a write, and routing to `main.bean` when a ledger declares no rules is the
   * long-standing fallback.
   */
  /**
   * A target the caller names must be a file the ledger loads: written
   * anywhere else, the entry commits and no read ever shows it (w23/035).
   * Auto-routed targets are the ledger's own routing rules and may create
   * the file they route to.
   */
  private async assertLoaded(
    ledgerId: string,
    identity: Identity,
    path: string,
  ): Promise<void> {
    const [ledgerOwner, ledgerName] = ledgerId.split("/");
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );
    const sourceFiles = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerSourceFiles(ledgerOwner, ledgerName),
      "get ledger source files",
    );
    if (sourceFiles.includes(path)) return;
    throw new BadUserInputError(
      `${path} is not included by the ledger (main.bean does not reach it); add an include for it, or omit path to auto-route`,
      "path",
      "Name a file the ledger loads (the `source-files` read lists them), or create the file and `include` it first.",
    );
  }

  private async fetchBcioOptions(
    ledgerId: string,
    identity: Identity,
  ): Promise<BcioOptionsPublic | undefined> {
    const [ledgerOwner, ledgerName] = ledgerId.split("/");
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );
    const response = await favaApiClient.reports.getLedgerBcioOptions(
      ledgerOwner,
      ledgerName,
    );
    return response.data.success ? response.data.data : undefined;
  }
}
