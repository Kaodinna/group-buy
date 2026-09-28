interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again in a moment.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-black/3 dark:hover:bg-white/6"
        >
          Try again
        </button>
      )}
    </div>
  );
}
