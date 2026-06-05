import EmptyState from "./EmptyState";
import RetryButton from "./RetryButton";

export default function ErrorState({
  message = "Intenta nuevamente en unos segundos.",
  onRetry,
  retryLabel = "Reintentar",
  title = "No se pudo cargar la informacion",
}) {
  return (
    <div role="alert">
      <EmptyState title={title} message={message}>
        <RetryButton onRetry={onRetry}>{retryLabel}</RetryButton>
      </EmptyState>
    </div>
  );
}
