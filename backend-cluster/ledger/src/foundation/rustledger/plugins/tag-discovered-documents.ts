import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import type { PluginContext, PluginResult } from "./types";
import { inheritDirectiveSourceId, isGeneratedDirective } from "./provenance";

/**
 * Port of fava's `tag_discovered_documents` plugin: each `document` Beancount
 * found by walking the `option "documents"` folders (no source line, identified
 * by `meta.lineno == 0`) gains the `#discovered` tag. Here those are the
 * documents the engine's discovery made from the repository's file list, the
 * only documents marked generated (w21/738). A written `document` is left
 * alone.
 */
export function tagDiscoveredDocuments(
  directives: DirectiveJson[],
  _options: LedgerOptions,
  _ctx: PluginContext,
): PluginResult {
  return {
    directives: directives.map((directive) => {
      if (directive.type !== "document" || !isGeneratedDirective(directive)) {
        return directive;
      }
      const tagged: DirectiveJson = {
        ...directive,
        tags: [...new Set([...(directive.tags ?? []), "discovered"])],
      };
      inheritDirectiveSourceId(directive, tagged);
      return tagged;
    }),
    errors: [],
  };
}
