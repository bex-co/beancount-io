export function TypingIndicator() {
  return (
    <div
      data-typing-indicator=""
      className="flex items-center gap-1 px-3.5 py-3"
    >
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-50 [animation-delay:-0.3s] motion-reduce:animate-none" />
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-50 [animation-delay:-0.15s] motion-reduce:animate-none" />
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-50 motion-reduce:animate-none" />
    </div>
  );
}
