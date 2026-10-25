/**
 * Whether a Monaco widget inside `root` currently owns Escape: the Find
 * widget (shown with its `visible` class) or the Go to Line quick input
 * (displayed only while open). Entry Context's dialog must not dismiss on
 * that Escape; Monaco closes the widget, and a later bare Escape dismisses
 * the dialog (w4/1062, following w4/968's widget-ownership rule).
 */
export function hasActiveMonacoWidget(root: ParentNode): boolean {
  if (root.querySelector(".monaco-editor .find-widget.visible")) return true;
  const quickInput = root.querySelector<HTMLElement>(
    ".monaco-editor .quick-input-widget",
  );
  return quickInput !== null && quickInput.style.display !== "none";
}
