import type * as monaco from "monaco-editor";

/**
 * Align amounts in Beancount posting lines to a specific column
 * Based on Fava's align() function
 */
export function alignAmounts(
  editor: monaco.editor.IStandaloneCodeEditor,
  currencyColumn: number = 61,
): void {
  const model = editor.getModel();
  if (!model) return;

  // Beancount currency pattern (uppercase letters, numbers, underscores, etc.)
  const CURRENCY_RE = "[A-Z][A-Z0-9_'.-]*";

  // Regex to match posting lines with amounts
  // Captures: (account/prefix) (number) (currency and rest)
  const ALIGN_RE = new RegExp(
    `^([^";]*?)\\s+([-+]?\\s*[\\d,]+(?:\\.\\d*)?)\\s+(${CURRENCY_RE}\\b.*)`,
  );

  const lines: string[] = [];
  const totalLines = model.getLineCount();
  // A narration can span lines; a line that starts inside its quotes is
  // string content, however much it looks like a posting (w4/1013).
  let inString = false;

  for (let i = 1; i <= totalLines; i++) {
    const line = model.getLineContent(i);
    const startsInString = inString;
    inString = endsInsideString(line, inString);
    const match = startsInString ? null : ALIGN_RE.exec(line);

    if (match) {
      const [, prefix, number, rest] = match;
      // Calculate spaces needed to align to currency column
      // -4 accounts for the two spaces before and after the number
      const numSpaces = currencyColumn - prefix.length - number.length - 4;
      const spaces = " ".repeat(Math.max(0, numSpaces));
      lines.push(`${prefix}${spaces}  ${number} ${rest}`);
    } else {
      // Keep non-matching lines as-is
      lines.push(line);
    }
  }

  const newContent = lines.join("\n");
  if (newContent === model.getValue()) return;

  // executeEdits records the edit but pushes no Undo stop, so it joined the
  // typing before it and one Undo took both (w4/969). Stops on both sides
  // make the alignment its own step.
  editor.pushUndoStop();
  editor.executeEdits("align-amounts", [
    {
      range: model.getFullModelRange(),
      text: newContent,
    },
  ]);
  editor.pushUndoStop();
}

/**
 * Whether `line` leaves a string open, given whether it began inside one.
 * Inside a string `\` escapes the next character and `"` closes it; outside,
 * `"` opens one and `;` starts a comment that runs to the end of the line.
 */
function endsInsideString(line: string, inside: boolean): boolean {
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inside) {
      if (char === "\\") i += 1;
      else if (char === '"') inside = false;
    } else if (char === '"') {
      inside = true;
    } else if (char === ";") {
      break;
    }
  }
  return inside;
}

/**
 * Toggle line comments on selected lines or current line
 * Uses Monaco's built-in comment action
 */
export function toggleComment(
  editor: monaco.editor.IStandaloneCodeEditor,
): void {
  editor.trigger("keyboard", "editor.action.commentLine", {});
}

/**
 * Fold all foldable regions in the editor
 */
export function foldAll(editor: monaco.editor.IStandaloneCodeEditor): void {
  editor.trigger("keyboard", "editor.foldAll", {});
}

/**
 * Unfold all folded regions in the editor
 */
export function unfoldAll(editor: monaco.editor.IStandaloneCodeEditor): void {
  editor.trigger("keyboard", "editor.unfoldAll", {});
}

/**
 * Register keyboard shortcuts for editor actions
 * Should be called in the editor's onMount callback
 */
export function registerEditorShortcuts(
  editor: monaco.editor.IStandaloneCodeEditor,
  monaco: typeof import("monaco-editor"),
): void {
  // Cmd+d or Ctrl+d - Align Amounts
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
    alignAmounts(editor);
  });

  // Cmd+/ or Ctrl+/ - Toggle Comment
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
    toggleComment(editor);
  });

  // Cmd+Alt+[ or Ctrl+Alt+[ - Fold All
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.BracketLeft,
    () => {
      foldAll(editor);
    },
  );

  // Cmd+Alt+] or Ctrl+Alt+] - Unfold All
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.BracketRight,
    () => {
      unfoldAll(editor);
    },
  );
}
