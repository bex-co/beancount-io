import { useRef, useEffect } from "react";
import { Button } from "@/common/components/ui/button";
import { Textarea } from "@/common/components/ui/textarea";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  onStop?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  stopLabel?: string;
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  onClear,
  disabled,
  isStreaming,
  placeholder,
  stopLabel = "Stop",
  ref,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    if (typeof ref === "function") {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  };

  // Autofocus on mount — but not on touch devices, where focusing pops the
  // virtual keyboard and shoves the layout.
  useEffect(() => {
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    textareaRef.current?.focus();
  }, []);

  // Auto-resize logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [value]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    } else if (e.key === "Escape") {
      onClear?.();
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <Textarea
        ref={setRefs}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="resize-none max-h-30 min-h-11 pr-12 py-2.5 flex-1 placeholder:truncate"
        rows={1}
      />
      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          onClick={onStop}
          aria-label={stopLabel}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !value.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
