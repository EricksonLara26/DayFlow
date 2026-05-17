import LoadingSpinner from "./LoadingSpinner";

export default function LoadingOverlay({ show = false }) {
  if (!show) {
    return null;
  }

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-overlay-panel">
        <LoadingSpinner size="lg" />
        <p>Cargando...</p>
      </div>
    </div>
  );
}
