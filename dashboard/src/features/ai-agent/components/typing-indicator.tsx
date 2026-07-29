export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3.5 py-3">
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-40 [animation-delay:-0.3s]" />
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-40 [animation-delay:-0.15s]" />
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-40" />
    </div>
  );
}
