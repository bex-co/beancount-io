import { useRef, useEffect } from "react";
import { Button } from "@/common/components/ui/button";
import { Textarea } from "@/common/components/ui/textarea";
import {
  CornerDownLeft,
  FileText,
  FileImage,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import type { StagedFile } from "./attachment";

interface AgentChatInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  stagedFiles?: StagedFile[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
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
  const isImage = stagedFile.file.type.startsWith("image/");

  return (
    <div className="flex max-w-45 items-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 py-1 pl-2 pr-1 text-xs">
      {stagedFile.uploading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : stagedFile.error ? (
        <span className="h-3.5 w-3.5 shrink-0 text-xs font-bold text-destructive">
          !
        </span>
      ) : isImage && stagedFile.previewObjectUrl ? (
        <img
          src={stagedFile.previewObjectUrl}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover"
        />
      ) : isImage ? (
        <FileImage className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate text-foreground/80">
        {stagedFile.file.name}
      </span>
      {stagedFile.error && (
        <span className="shrink-0 font-medium text-destructive">failed</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 shrink-0 cursor-pointer rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Remove ${stagedFile.file.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function AgentChatInput({
  value,
  onValueChange,
  onSubmit,
  disabled,
  placeholder,
  stagedFiles = [],
  onFilesSelected,
  onRemoveFile,
}: AgentChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    <div className="rounded-2xl border border-border/80 bg-background/95 px-3 py-2.5 shadow-lg shadow-black/5 transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:shadow-xl focus-within:shadow-black/5 dark:shadow-black/20 dark:focus-within:shadow-black/25 sm:px-3.5">
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
          {stagedFiles.map((sf, idx) => (
            <StagedFileChip
              key={idx}
              stagedFile={sf}
              onRemove={() => onRemoveFile?.(idx)}
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
        className="min-h-10 max-h-30 resize-none border-0 bg-transparent p-1 text-base leading-6 shadow-none placeholder:truncate placeholder:text-muted-foreground/70 focus-visible:ring-0 md:text-base dark:bg-transparent"
        rows={1}
      />

      {/* Bottom toolbar */}
      <div className="mt-1 flex items-center justify-between">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={disabled}
          className="rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Button
          type="submit"
          size="icon-sm"
          disabled={!canSend}
          className="shrink-0 rounded-full"
          onClick={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {anyUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CornerDownLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
