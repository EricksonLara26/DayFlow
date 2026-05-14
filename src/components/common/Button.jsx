export default function Button({
  children,
  className = "",
  icon: Icon,
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} type={type} {...props}>
      {Icon ? <Icon size={17} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
