import { Inbox } from "lucide-react";

export default function EmptyState({ children, title = "No hay resultados", message }) {
  return (
    <div className="empty-state">
      <Inbox size={28} aria-hidden="true" />
      <strong>{title}</strong>
      {message ? <p>{message}</p> : null}
      {children ? <div className="empty-state-actions">{children}</div> : null}
    </div>
  );
}
