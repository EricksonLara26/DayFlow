export default function SuccessMessage({ children, className = "", message }) {
  const content = children ?? message;

  if (!content) {
    return null;
  }

  return (
    <p className={`form-success ${className}`.trim()} role="status" aria-live="polite">
      {content}
    </p>
  );
}
