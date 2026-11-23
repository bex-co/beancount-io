import { useRef, useEffect } from "react";
import { Button } from "@/common/components/ui/button";
import { Textarea } from "@/common/components/ui/textarea";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  ArrowUp,
  FileText,
  FileImage,
  Loader2,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import type { StagedFile } from "./attachment";

interface AgentChatInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  stagedFiles?: StagedFile[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveFile?: (id: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const INTERACTIVE_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='link']",
  "[role='textbox']",
  "[role='combobox']",
  "[role='menuitem']",
  "[role='option']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='slider']",
].join(",");

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(INTERACTIVE_TARGET_SELECTOR))
  );
}

function StagedFileChip({
  stagedFile,
  onRemove,
}: {
  stagedFile: StagedFile;
  onRemove: () => void;
}) {
  const { t } = useTranslations();
  const isImage = stagedFile.file.type.startsWith("image/");

  return (
    <div className="flex max-w-64 items-center gap-2 rounded-lg border border-border/80 bg-muted/60 py-1 pl-2 pr-1 text-xs sm:max-w-80 dark:border-white/15 dark:bg-card/80">
      {stagedFile.uploading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
      ) : stagedFile.error ? (
        <span className="h-3.5 w-3.5 shrink-0 text-xs font-bold text-destructive">
          !
        </span>
      ) : isImage && stagedFile.previewObjectUrl ? (
        <img
          src={stagedFile.previewObjectUrl}
          alt=""
          className="h-6 w-6 shrink-0 rounded-md border border-border/70 object-cover"
        />
      ) : isImage ? (
        <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate font-medium text-foreground/90">
        {stagedFile.file.name}
      </span>
      {stagedFile.error && (
        <span className="shrink-0 font-medium text-destructive">
          {t("aiAgent.attachmentFailed")}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-8"
        aria-label={t("aiAgent.removeAttachment", {
          fileName: stagedFile.file.name,
        })}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AgentChatInput({
  value,
  onValueChange,
  onSubmit,
  onStop,
  disabled,
  placeholder,
  stagedFiles = [],
  onFilesSelected,
  onRemoveFile,
  inputRef,
}: AgentChatInputProps) {
  const { t } = useTranslations();
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? internalTextareaRef;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autofocus on mount — but not on touch devices, where focusing pops the
  // virtual keyboard and shoves the layout.
  useEffect(() => {
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [value]);

  useEffect(() => {
    const handleGlobalTyping = (event: KeyboardEvent) => {
      const isAltGraph = event.getModifierState("AltGraph");
      const hasShortcutModifier =
        event.metaKey || ((event.ctrlKey || event.altKey) && !isAltGraph);

      if (
        disabled ||
        event.defaultPrevented ||
        event.isComposing ||
        hasShortcutModifier ||
        event.key.length !== 1 ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea || textarea.disabled) return;

      event.preventDefault();
      textarea.focus({ preventScroll: true });

      const nextValue = `${value}${event.key}`;
      onValueChange(nextValue);
      queueMicrotask(() => {
        if (
          document.activeElement === textarea &&
          textarea.value === nextValue
        ) {
          textarea.setSelectionRange(nextValue.length, nextValue.length);
        }
      });
    };

    window.addEventListener("keydown", handleGlobalTyping);
    return () => window.removeEventListener("keydown", handleGlobalTyping);
  }, [disabled, onValueChange, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // IME candidate confirmation uses Enter while composition is active.
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const anyUploading = stagedFiles.some((sf) => sf.uploading);
      if (
        (value.trim() || stagedFiles.length > 0) &&
        !disabled &&
        !anyUploading
      ) {
        onSubmit();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    onFilesSelected?.(Array.from(files));
    e.target.value = "";
  };

  const anyUploading = stagedFiles.some((sf) => sf.uploading);
  const canSend =
    (value.trim().length > 0 ||
      stagedFiles.some((sf) => sf.objectKey && !sf.error)) &&
    !disabled &&
    !anyUploading;

  return (
    <div
      data-focus-ring="composer"
      className="rounded-2xl border border-input bg-card px-4 pt-3.5 pb-2.5 shadow-md shadow-black/5 transition-[border-color,box-shadow] motion-reduce:transition-none focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 dark:border-input dark:bg-secondary/65 dark:shadow-xl dark:shadow-black/40 dark:focus-within:border-primary dark:focus-within:ring-primary/30"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.csv,.ofx,.qfx,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Staged file chips — shown inside the container at the top */}
      {stagedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {stagedFiles.map((sf) => (
            <StagedFileChip
              key={sf.id}
              stagedFile={sf}
              onRemove={() => onRemoveFile?.(sf.id)}
            />
          ))}
        </div>
      )}

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-12 max-h-36 resize-none border-0 bg-transparent px-0 py-1 text-base leading-6 shadow-none placeholder:text-muted-foreground focus-visible:ring-0 md:text-base dark:bg-transparent"
        rows={1}
      />

      {/* Bottom toolbar */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/80 pt-2 dark:border-white/12">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className="-ms-2 gap-1.5 rounded-lg px-2.5 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("aiAgent.attachFile")}
          >
            <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium">
              {t("aiAgent.attachFile")}
            </span>
          </Button>
          <span
            className={`hidden truncate text-xs text-muted-foreground sm:inline ${disabled ? "opacity-50" : ""}`}
          >
            {t("aiAgent.attachFormatsHint")}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {disabled && onStop ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {t("aiAgent.generating")}
            </span>
          ) : (
            <span className="hidden text-xs text-muted-foreground pointer-fine:sm:inline">
              {t("aiAgent.enterToSend")}
            </span>
          )}
          {disabled && onStop ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="shrink-0 rounded-full bg-foreground text-background shadow-xs hover:bg-foreground/90 pointer-coarse:size-11"
              aria-label={t("aiAgent.stop")}
              onClick={() => {
                onStop();
                requestAnimationFrame(() => {
                  textareaRef.current?.focus();
                });
              }}
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              className="shrink-0 rounded-full shadow-xs transition-colors motion-reduce:transition-none disabled:border disabled:border-border/75 disabled:bg-muted/80 disabled:text-muted-foreground disabled:opacity-100 pointer-coarse:size-11"
              aria-label={t("aiAgent.ask")}
              onClick={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              {anyUploading ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
