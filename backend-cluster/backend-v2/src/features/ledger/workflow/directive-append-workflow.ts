import { type BcioOptionsPublic } from "@/foundation/fava";
import { logger } from "@/shared/logger";
import { BadUserInputError } from "@/shared/errors";
import { resolveEntryFile } from "@/features/ledger/utils/entry-file-resolver";
import {
  insertDirectives,
  parseDirectiveText,
} from "@/features/ledger/utils/directive-text";
import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";
import { unifiedDiff } from "@/shared/unified-diff";
import {
  diffBeanCheckErrors,
  toBeanCheckErrors,
} from "@/features/ledger/utils/bean-check-errors";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { ILedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
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
 * `ILedgerRepoService`, so every path is asserted per operation and the dry
 * run refuses exactly what the commit would, by construction rather than by
 * two implementations agreeing.
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
  "getFilesContent" | "checkProjectedFiles" | "changeFiles"
>;

export class DirectiveAppendWorkflow implements IDirectiveAppendWorkflow {
  private readonly logger = logger.child({ module: "directive-append" });

  constructor(
    private readonly ledgerRepo: RepoDeps,
    private readonly favaClientFactory: IFavaClientFactory,
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
    const directives = parseDirectiveText(text);
    if (directives.length > MAX_APPENDED_DIRECTIVES) {
      throw new BadUserInputError(
        `text holds ${directives.length} directives; at most ${MAX_APPENDED_DIRECTIVES} may be appended per call. Split the text into several calls.`,
      );
    }
    // Still asserted here, ahead of any work, so a bad explicit path is a
    // refusal rather than a wasted read. Auto-routed targets are asserted too
    // now — by the repo service, on every operation it is handed.
    if (path !== undefined) assertSafeRepoPath(path, "path");

    const bcioData = await this.fetchBcioOptions(ledgerId, identity);

    // Group by target file so one commit covers however many files the
    // ledger's own routing rules spread the text across.
    const byPath = new Map<string, typeof directives>();
    for (const directive of directives) {
      const target =
        path ??
        (bcioData
          ? resolveEntryFile(
              directive.kind,
              directive.date ? new Date(directive.date) : new Date(),
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

    // One record per touched file rather than five collections keyed on the
    // same path: the sha, the projected text, and where each directive landed
    // travel together, so nothing has to be re-looked-up to build the commit.
    const targets = [...byPath].map(([target, targetDirectives]) => {
      const current = existing.get(target);
      const before = current?.content ?? "";
      const result = insertDirectives(before, targetDirectives);
      return {
        path: target,
        sha: current?.sha,
        before: current ? before : null,
        content: result.content,
        lines: result.inserted.map((inserted) => inserted.line),
        appended: result.appended,
      };
    });

    const [baseline, projected] = await Promise.all([
      this.checkProjected(ledgerId, identity, []),
      this.checkProjected(
        ledgerId,
        identity,
        targets.map(({ path: p, content }) => ({ path: p, content })),
      ),
    ]);
    const newErrors = diffBeanCheckErrors(baseline, projected);

    if (newErrors.length > 0 && !allowInvalid) {
      throw unbalancedOrValidationError(newErrors);
    }

    const paths = targets.map((target) => target.path);
    const noun = directives.length === 1 ? "directive" : "directives";
    const summary = `${directives.length} ${noun} to ${paths.join(", ")}`;
    if (!dryRun) {
      await this.ledgerRepo.changeFiles({
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
    }

    return {
      success: true,
      message: dryRun ? `Would add ${summary}` : `Added ${summary}`,
      dryRun,
      count: directives.length,
      wrote: dryRun
        ? []
        : targets.flatMap((target) =>
            target.lines.map((line) => ({ path: target.path, line })),
          ),
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
