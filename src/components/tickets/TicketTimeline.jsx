import EmptyState from "../common/EmptyState";
import { formatDateTime } from "../../utils/dateUtils";

export default function TicketTimeline({ history }) {
  return (
    <section className="detail-section">
      <div className="section-heading">
        <h2>Historial</h2>
        <span>{history.length}</span>
      </div>
      <div className="timeline-list">
        {history.length ? (
          history.map((item) => (
            <article className="timeline-item" key={item.id}>
              <span className="timeline-dot" />
              <div>
                <strong>{item.action}</strong>
                <span>{item.userName}</span>
                <time>{formatDateTime(item.createdAt)}</time>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="Sin historial" message="Los cambios importantes se registraran aqui." />
        )}
      </div>
    </section>
  );
}
