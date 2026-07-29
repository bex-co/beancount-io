import type { RefObject } from "react";
import { useBlocker } from "@tanstack/react-router";
import type * as monaco from "monaco-editor";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/common/components/ui/dropdown-menu";
import {
  Save,
  X,
  ChevronDown,
  AlignLeft,
  MessageSquare,
  ChevronUp,
} from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useIsMac } from "../../hooks/use-platform";
import {
  alignAmounts,
  toggleComment,
  foldAll,
  unfoldAll,
} from "./text-editor-utils";

export interface EditModeToolbarProps {
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  editedContent: string;
  plainContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

/**
 * Edit-mode toolbar - the editor actions menu, Save/Cancel buttons, and the
 * unsaved-changes navigation guard shown next to the breadcrumb when a text
 * file is being edited. The editor itself is rendered once by `TextFileView`
 * and shared across modes; menu actions operate on it through `editorRef`.
 */
export function EditModeToolbar({
  editorRef,
  editedContent,
  plainContent,
  onSave,
  onCancel,
  isSaving,
}: EditModeToolbarProps) {
  const { t } = useTranslations();
  const isMac = useIsMac();

  const hasUnsavedChanges = editedContent !== plainContent;

  // Block all navigation (route changes, query params, browser back/refresh) with unsaved changes
  const blocker = useBlocker({
    shouldBlockFn: () => hasUnsavedChanges,
    enableBeforeUnload: true,
    withResolver: true,
  });

  // Run an editor action against the shared editor instance, if mounted.
  const runEditorAction = (
    action: (editor: monaco.editor.IStandaloneCodeEditor) => void,
  ) => {
    if (editorRef.current) {
      action(editorRef.current);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* Editor Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">{t("common.edit")}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => runEditorAction(alignAmounts)}>
              <AlignLeft className="h-4 w-4 mr-2" />
              {t("ledgerEditor.alignAmounts")}
              <DropdownMenuShortcut>
                {isMac ? "⌘D" : "Ctrl+D"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => runEditorAction(toggleComment)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("ledgerEditor.toggleComment")}
              <DropdownMenuShortcut>
                {isMac ? "⌘/" : "Ctrl+/"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => runEditorAction(foldAll)}>
              <ChevronUp className="h-4 w-4 mr-2" />
              {t("ledgerEditor.foldAll")}
              <DropdownMenuShortcut>
                {isMac ? "⌘⌥[" : "Ctrl+Alt+["}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => runEditorAction(unfoldAll)}>
              <ChevronDown className="h-4 w-4 mr-2" />
              {t("ledgerEditor.unfoldAll")}
              <DropdownMenuShortcut>
                {isMac ? "⌘⌥]" : "Ctrl+Alt+]"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSave(editedContent)}
            disabled={isSaving}
            className="flex items-center gap-2 flex-1 md:flex-none"
          >
            <Save className="h-4 w-4" />
            <span className="hidden md:inline">
              <span>{isSaving ? t("common.saving") : t("common.save")}</span>
              <span className="ml-2 text-xs tracking-widest text-muted-foreground">
                {isMac ? "⌘S" : "Ctrl+S"}
              </span>
            </span>
          </Button>
          {hasUnsavedChanges && !isSaving && (
            <span className="absolute top-1 right-1 h-1 w-1 rounded-full bg-yellow-200" />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex items-center gap-2 sm:flex-none"
        >
          <X className="h-4 w-4" />
          <span className="hidden md:inline">
            <span> {t("common.cancel")}</span>
            <span className="ml-2 text-xs tracking-widest text-muted-foreground">
              Esc
            </span>
          </span>
        </Button>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("ledgerEditor.unsavedChanges")}</DialogTitle>
            <DialogDescription>
              {t("ledgerEditor.unsavedChangesMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => blocker.reset?.()}
              className="w-full sm:w-auto"
            >
              {t("ledgerEditor.stay")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => blocker.proceed?.()}
              className="w-full sm:w-auto"
            >
              {t("ledgerEditor.leaveWithoutSaving")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
