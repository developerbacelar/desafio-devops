interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 font-medium underline">
        Tentar novamente
      </button>
    </div>
  );
}
