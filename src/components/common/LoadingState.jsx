import EmptyState from "./EmptyState";
import LoadingSpinner from "./LoadingSpinner";

export default function LoadingState({
  message = "Estamos preparando la informacion.",
  title = "Cargando",
}) {
  return (
    <EmptyState title={title} message={message}>
      <LoadingSpinner size="md" />
    </EmptyState>
  );
}
