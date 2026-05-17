export default function Button({
  children,
  className = "",
  disabled = false,
  icon: Icon,
  loading = false,
  loadingText = "Cargando...",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} ${loading ? "is-loading" : ""} ${className}`.trim()}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <>
          <span className="button-spinner" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {Icon ? <Icon size={17} aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </button>
  );
}
