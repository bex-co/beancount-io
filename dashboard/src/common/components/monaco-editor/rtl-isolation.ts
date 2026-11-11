import type { OnMount } from "@monaco-editor/react";
import {
  hasRtlLetters,
  rtlIsolationRanges,
} from "@/common/lib/bidi/rtl-source";

type Editor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

/**
 * Isolate each right-to-left word of ledger source in the editor, as the diff
 * viewer does: a posting to `Assets:Qa:ملی` otherwise drew its amount next to
 * the Persian segment and the segment's colon at the far end (w2/118). Inline
 * decorations add only a class (`.bidi-isolate` in `style.css`, which also
 * turns Monaco's own per-token RTL isolates left to right), never
 * characters, so the model keeps the ledger's bytes. Recomputed on every
 * edit; a model without Hebrew or Arabic-script letters gets none.
 */
export function isolateRtlText(editor: Editor, monaco: Monaco): void {
  const decorations = editor.createDecorationsCollection();
  const apply = () => {
    const model = editor.getModel();
    if (!model || !hasRtlLetters(model.getValue())) {
      decorations.clear();
      return;
    }
    const next: Parameters<typeof decorations.set>[0][number][] = [];
    for (let line = 1; line <= model.getLineCount(); line += 1) {
      for (const { start, end } of rtlIsolationRanges(
        model.getLineContent(line),
      )) {
        next.push({
          range: new monaco.Range(line, start + 1, line, end + 1),
          options: { inlineClassName: "bidi-isolate" },
        });
      }
    }
    decorations.set(next);
  };
  apply();
  const onContent = editor.onDidChangeModelContent(apply);
  const onModel = editor.onDidChangeModel(apply);
  editor.onDidDispose(() => {
    onContent.dispose();
    onModel.dispose();
  });
}
