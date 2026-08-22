import type {
  BeancountError,
  DirectiveJson,
  LedgerOptions,
} from "@rustledger/wasm";
import {
  pluginError,
  type PluginContext,
  type PluginFn,
  type PluginResult,
} from "./types";
import { amortizeOver } from "./amortize-over";
import { forecast } from "./forecast";
import { linkDocuments } from "./link-documents";
import { tagDiscoveredDocuments } from "./tag-discovered-documents";
import { getDirectiveSourceId as sourceIdOf } from "./provenance";
export {
  captureDirectiveSourceIds,
  getDirectiveSourceId,
  getDirectiveSourceLocation,
  inheritDirectiveSourceId,
  restoreDirectiveSourceIds,
  seedDirectiveSourceIds,
  type DirectiveSourceLocation,
} from "./provenance";

export { pluginError };
export type { PluginContext, PluginFn, PluginResult };
export {
  stripFavaPlugins,
  neutralizeIncludedOptionsAndPlugins,
  type StripResult,
  type StrippedPlugin,
} from "./strip";
export {
  collectLedgerPlugins,
  PLUGIN_LINE_RE,
  decodeStringLiteral,
} from "./collect-plugins";

/**
 * Registry of fava plugins reimplemented in the TypeScript post-parse layer,
 * keyed by their full `plugin "..."` name. Applied by {@link applyPlugins} after
 * the WASM parse (their source directives are stripped by `stripFavaPlugins`).
 */
export const PLUGIN_REGISTRY: Record<string, PluginFn> = {
  "fava.plugins.amortize_over": amortizeOver,
  "fava.plugins.forecast": forecast,
  "fava.plugins.link_documents": linkDocuments,
  "fava.plugins.tag_discovered_documents": tagDiscoveredDocuments,
};

/** The set of fava plugin names handled in TS (vs. merely stripped + warned). */
export const HANDLED_PLUGIN_NAMES: ReadonlySet<string> = new Set(
  Object.keys(PLUGIN_REGISTRY),
);

/** Small bounded Levenshtein distance for friendly plugin-name typo hints. */
function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      current.push(
        Math.min(
          current[rightIndex] + 1,
          previous[rightIndex + 1] + 1,
          previous[rightIndex] +
            (left[leftIndex] === right[rightIndex] ? 0 : 1),
        ),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function closestHandledPlugin(name: string): string | undefined {
  if (name.length > 256) return undefined;
  const candidates = [...HANDLED_PLUGIN_NAMES]
    .map((candidate) => ({
      candidate,
      distance: editDistance(name, candidate),
    }))
    .sort((left, right) => left.distance - right.distance);
  return candidates[0]?.distance <= 2 ? candidates[0].candidate : undefined;
}

/**
 * Local "today" as `YYYY-MM-DD`, matching fava's `local_today()` and the
 * convention in `directive-filter.ts`. Used as the default `PluginContext.today`
 * for time-dependent plugins (amortize's future-filter and forecast's default
 * horizon) when a caller does not inject a fixed date.
 */
export function localTodayStr(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Apply the registered TS plugins to the parsed directive stream, in the order
 * the plugins were declared (beancount runs plugins ordered, threading each
 * output into the next). Declared names not in the registry are skipped here
 * (native plugins already ran in the WASM; unsupported fava plugins are surfaced
 * as warnings by the caller via {@link skippedPluginWarning}).
 *
 * Each plugin invocation is fault-isolated: plugins transform user-authored
 * ledger data, so a thrown exception must degrade to a `phase: "plugin"` ledger
 * error (code `TS_PLUGIN_FAILED`) — never crash the report pipeline. A failed
 * plugin leaves the directive stream exactly as it was before that plugin ran;
 * subsequent plugins still run over that stream.
 */
export function applyPlugins(
  declared: string[],
  directives: DirectiveJson[],
  options: LedgerOptions,
  ctx: PluginContext,
  registry: Record<string, PluginFn> = PLUGIN_REGISTRY,
): { directives: DirectiveJson[]; errors: BeancountError[] } {
  let current = directives;
  const errors: BeancountError[] = [];
  declared.forEach((name) => {
    const fn = Object.hasOwn(registry, name) ? registry[name] : undefined;
    if (fn === undefined) return;
    try {
      const result = fn(current, options, ctx);
      current = sortPluginOutput(current, result.directives);
      errors.push(...result.errors);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(
        pluginError(
          `Plugin "${name}" failed and was skipped; its effects were not applied. (${message})`,
          { code: "TS_PLUGIN_FAILED" },
        ),
      );
    }
  });
  return { directives: current, errors };
}

const DIRECTIVE_SORT_ORDER: Partial<Record<DirectiveJson["type"], number>> = {
  open: -2,
  balance: -1,
  document: 1,
  close: 2,
};

/**
 * Beancount sorts the complete stream by `data.entry_sortkey` after every
 * plugin. Preserve the raw stream's source order as the `lineno` equivalent;
 * plugin clones inherit the same source ID through the provenance sidecar.
 */
function sortPluginOutput(
  input: DirectiveJson[],
  output: DirectiveJson[],
): DirectiveJson[] {
  const sourceOrder = new Map<string, number>();
  input.forEach((directive, index) => {
    const sourceId = sourceIdOf(directive);
    if (sourceId !== undefined && !sourceOrder.has(sourceId)) {
      sourceOrder.set(sourceId, index);
    }
  });

  return output
    .map((directive, outputOrder) => ({
      directive,
      outputOrder,
      sourceOrder: sourceOrder.get(sourceIdOf(directive) ?? "") ?? outputOrder,
    }))
    .sort((left, right) => {
      const dateOrder = left.directive.date.localeCompare(right.directive.date);
      if (dateOrder !== 0) return dateOrder;
      const typeOrder =
        (DIRECTIVE_SORT_ORDER[left.directive.type] ?? 0) -
        (DIRECTIVE_SORT_ORDER[right.directive.type] ?? 0);
      if (typeOrder !== 0) return typeOrder;
      const sourceOrderDifference = left.sourceOrder - right.sourceOrder;
      return sourceOrderDifference !== 0
        ? sourceOrderDifference
        : left.outputOrder - right.outputOrder;
    })
    .map((item) => item.directive);
}

/**
 * A friendly `severity: "warning"` error (code `TS_PLUGIN_SKIPPED`) for a
 * stripped fava plugin that has no TS reimplementation — shown to the user
 * instead of the raw engine `E8005`.
 */
export function skippedPluginWarning(
  name: string,
  line: number,
  entryPoint: string,
): BeancountError {
  const suggestion = closestHandledPlugin(name);
  return pluginError(
    `Plugin "${name}" is not supported by the in-process engine and was skipped; its effects were not applied.`,
    {
      code: "TS_PLUGIN_SKIPPED",
      severity: "warning",
      file: entryPoint,
      line,
      hint:
        suggestion === undefined
          ? "Reimplement this plugin in the TypeScript engine, or remove it from the ledger."
          : `Did you mean "${suggestion}"? Correct the declaration or remove the unsupported plugin.`,
    },
  );
}
