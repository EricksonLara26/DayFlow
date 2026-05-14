export default function Badge({ children, className = "" }) {
  return <span className={`app-badge ${className}`.trim()}>{children}</span>;
}
