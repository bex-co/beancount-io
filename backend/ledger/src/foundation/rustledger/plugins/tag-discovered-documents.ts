import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import type { PluginContext, PluginResult } from "./types";

/**
 * Port of fava's `tag_discovered_documents` plugin — a **faithful no-op** in this
 * architecture.
 *
 * The Python plugin tags AUTO-DISCOVERED `document` directives (those beancount
 * synthesized by walking the `option "documents"` folder on disk, identified by
 * `meta.lineno == 0`) with `#discovered`. The in-process rustledger/WASM engine
 * has NO filesystem and does not auto-discover documents (the FileMap contains
 * only `.bean` files), and its `DirectiveJson.document` exposes no `meta`/`lineno`
 * — so there are no discovered documents to tag and no signal to identify one.
 *
 * It is registered (rather than left unhandled) so its `plugin` directive is
 * stripped and never surfaces `E8005`, but it makes no changes. Restoring real
 * behaviour would require implementing document auto-discovery — a separate,
 * much larger feature. See `docs/rustledger-parity-checklist.md` for the
 * documented divergence.
 */
export function tagDiscoveredDocuments(
  directives: DirectiveJson[],
  _options: LedgerOptions,
  _ctx: PluginContext,
): PluginResult {
  return { directives, errors: [] };
}
